import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore"
import { db } from "./config"

const DOUBTS_PER_PAGE = 15

// Fetch doubt-tagged posts, optionally filtered by branch + year
export async function getDoubtPosts(cursor = null, branch = null, year = null) {
  let q = query(
    collection(db, "posts"),
    where("tags", "array-contains", "doubt"),
    orderBy("createdAt", "desc"),
    limit(DOUBTS_PER_PAGE + 1),
  )
  if (cursor) q = query(
    collection(db, "posts"),
    where("tags", "array-contains", "doubt"),
    orderBy("createdAt", "desc"),
    startAfter(cursor),
    limit(DOUBTS_PER_PAGE + 1),
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Client-side branch/year filter (stored on user, not post — filter by authorBranch if denormalized)
  // For now filter by authorBranch / authorYear if available on the post doc
  if (branch) posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  if (year)   posts = posts.filter(p => !p.authorYear   || p.authorYear   === year)

  const hasMore = posts.length > DOUBTS_PER_PAGE
  if (hasMore) posts.pop()

  const nextCursor = snap.docs.length > DOUBTS_PER_PAGE
    ? snap.docs[DOUBTS_PER_PAGE - 1]
    : null

  return { posts, nextCursor, hasMore }
}
