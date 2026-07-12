import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'
import { db } from './config'

const CAMPUS_PER_PAGE = 15

// Fetch posts tagged with "note"
export async function getNotesPosts(cursor = null, branch = null, year = null) {
  let q = query(
    collection(db, 'posts'),
    where('tags', 'array-contains', 'note'),
    orderBy('createdAt', 'desc'),
    limit(CAMPUS_PER_PAGE + 1),
  )

  if (cursor) {
    q = query(
      collection(db, 'posts'),
      where('tags', 'array-contains', 'note'),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(CAMPUS_PER_PAGE + 1),
    )
  }

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Filter client-side by authorBranch / authorYear
  if (branch) {
    posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  }
  if (year) {
    posts = posts.filter(p => !p.authorYear || p.authorYear === year)
  }

  const hasMore = posts.length > CAMPUS_PER_PAGE
  if (hasMore) posts.pop()

  const nextCursor = snap.docs.length > CAMPUS_PER_PAGE
    ? snap.docs[CAMPUS_PER_PAGE - 1]
    : null

  return { posts, nextCursor, hasMore }
}

// Fetch trending/hot posts from the last 14 days, ranked by engagement (likes * 2 + comments * 3)
export async function getHotPosts(branch = null, year = null) {
  // Query last 100 posts to ensure we have content to rank, even in smaller cohorts
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(100)
  )

  const snap = await getDocs(q)
  let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Filter client-side by branch/year if specified
  if (branch) {
    posts = posts.filter(p => !p.authorBranch || p.authorBranch === branch)
  }
  if (year) {
    posts = posts.filter(p => !p.authorYear || p.authorYear === year)
  }

  // Calculate engagement score: likes * 2 + comments * 3
  const ranked = posts.map(p => {
    const score = (p.likeCount ?? 0) * 2 + (p.commentCount ?? 0) * 3
    return { ...p, engagementScore: score }
  })
  
  // Sort by engagement score descending
  ranked.sort((a, b) => b.engagementScore - a.engagementScore)

  // Return top 20 trending posts
  return ranked.slice(0, 20)
}
