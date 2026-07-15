import { collection, query, orderBy, limit, startAfter, getDocs } from "firebase/firestore"
import { db } from "./config"

const DOUBTS_PER_PAGE = 15
const FETCH_POOL = 100  // fetch more, filter client-side (avoids composite index)

// Fetch doubt-tagged posts, optionally filtered by branch + year
export async function getDoubtPosts(cursor = null, branch = null, year = null) {
  // Fetch a pool of recent posts WITHOUT array-contains filter
  // (avoids needing a missing composite index on tags + createdAt)
  let q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(FETCH_POOL),
  )
  if (cursor) q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    startAfter(cursor),
    limit(FETCH_POOL),
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Filter by tags client-side
  posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes('doubt'))

  // Filter by branch/year if set
  if (branch) posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  if (year)   posts = posts.filter(p => !p.authorYear   || p.authorYear   === year)

  const hasMore = snap.docs.length === FETCH_POOL
  const nextCursor = snap.docs[snap.docs.length - 1] ?? null

  return { posts, nextCursor, hasMore }
}
