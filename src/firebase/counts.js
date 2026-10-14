import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { db } from './config'
import { engagementCounts } from '../utils/engagementCounts'

// Stored aggregates are not authoritative. Read the underlying owned records.
//
// Read-cost note: computing real counts for a post costs 1 read per like/
// reaction record plus 1 aggregation read for comments. Feed builds call this
// for ~160 posts at once, so results are cached per post for a short TTL.
// A user's own writes (like, reaction, comment) invalidate the entry so their
// action is reflected immediately; other users' counts can lag by up to TTL.
const COUNTS_TTL = 60 * 1000 // 60 seconds
const countsCache = new Map() // postId -> { data, time }

export function invalidatePostCounts(postId) {
  countsCache.delete(postId)
}

export async function withPostCounts(posts) {
  const now = Date.now()
  const fresh = new Map() // postId -> cached data
  const toFetch = []
  for (const post of posts) {
    const hit = countsCache.get(post.id)
    if (hit && now - hit.time < COUNTS_TTL) fresh.set(post.id, hit.data)
    else toFetch.push(post)
  }

  const fetched = await Promise.all(toFetch.map(async post => {
    const [likes, comments] = await Promise.all([
      getDocs(query(collection(db, 'likes'), where('postId', '==', post.id))),
      getCountFromServer(collection(db, 'posts', post.id, 'comments')),
    ])
    const data = { ...engagementCounts(post.id, likes.docs.map(d => ({ id: d.id, ...d.data() }))), commentCount: comments.data().count }
    countsCache.set(post.id, { data, time: Date.now() })
    return [post.id, data]
  }))
  const fetchedMap = new Map(fetched)

  return posts.map(post => {
    const counts = fresh.get(post.id) ?? fetchedMap.get(post.id)
    return { ...post, ...counts }
  })
}
