import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'
import { db } from './config'

const CAMPUS_PER_PAGE = 15
const FETCH_POOL = 100  // fetch more, filter client-side (avoids composite index)

// Fetch posts tagged with "note" — filters client-side to avoid missing composite index
export async function getNotesPosts(cursor = null, branch = null, year = null) {
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(FETCH_POOL),
  )
  if (cursor) q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(FETCH_POOL),
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Filter by tags client-side
  posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes('note'))

  // Filter by branch/year if set
  if (branch) posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  if (year)   posts = posts.filter(p => !p.authorYear   || p.authorYear   === year)

  const hasMore = snap.docs.length === FETCH_POOL
  const nextCursor = snap.docs[snap.docs.length - 1] ?? null

  return { posts, nextCursor, hasMore }
}

// Fetch posts tagged with "collab" — client-side filter to avoid composite index
export async function getCollabPosts(cursor = null, branch = null, year = null) {
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(FETCH_POOL),
  )
  if (cursor) q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(FETCH_POOL),
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes('collab'))

  if (branch) posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  if (year)   posts = posts.filter(p => !p.authorYear   || p.authorYear   === year)

  const hasMore = snap.docs.length === FETCH_POOL
  const nextCursor = snap.docs[snap.docs.length - 1] ?? null

  return { posts, nextCursor, hasMore }
}

export async function getHotPosts(branch = null, year = null) {
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(100)
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  if (branch) posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  if (year)   posts = posts.filter(p => !p.authorYear   || p.authorYear   === year)

  const ranked = posts.map(p => ({
    ...p,
    engagementScore: (p.likeCount ?? 0) * 2 + (p.commentCount ?? 0) * 3
  }))
  ranked.sort((a, b) => b.engagementScore - a.engagementScore)

  return ranked.slice(0, 20)
}
