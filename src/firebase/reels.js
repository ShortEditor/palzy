import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from './config'

const REELS_PER_PAGE = 5

/**
 * Fetch algorithm-ranked reels (posts with imageURL).
 * Score = likeCount×2 + commentCount×3 + recencyBonus
 * Sorted server-side by likeCount desc first (Firestore limitation),
 * then re-ranked client-side with recency decay.
 *
 * Pagination: cursor-based using the last Firestore document snapshot.
 */
export async function getReelsFeed(cursor = null, seenIds = new Set()) {
  // Pull a wider batch to allow for client-side scoring + dedup
  const FETCH_BATCH = REELS_PER_PAGE * 4

  let q = query(
    collection(db, 'posts'),
    where('imageURL', '!=', null),   // only image/reel posts
    orderBy('imageURL'),             // required when using where != null
    orderBy('createdAt', 'desc'),
    limit(FETCH_BATCH),
  )

  if (cursor) {
    q = query(
      collection(db, 'posts'),
      where('imageURL', '!=', null),
      orderBy('imageURL'),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(FETCH_BATCH),
    )
  }

  const snap = await getDocs(q)
  if (snap.empty) return { reels: [], nextCursor: null, hasMore: false }

  const now = Date.now()
  const MS_PER_HOUR = 3_600_000

  // Client-side score: engagement + recency decay
  const scored = snap.docs
    .filter(d => !seenIds.has(d.id))
    .map(d => {
      const data = d.data()
      const ageHours = (now - (data.createdAt?.toMillis?.() ?? now)) / MS_PER_HOUR
      // Recency bonus: halves every 24h (like HN algorithm)
      const recencyBonus = Math.pow(0.97, ageHours)
      const score = (data.likeCount ?? 0) * 2 +
                    (data.commentCount ?? 0) * 3 +
                    recencyBonus * 10
      return { id: d.id, _snap: d, score, ...data }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, REELS_PER_PAGE)

  const nextCursor = snap.docs[snap.docs.length - 1] ?? null

  return {
    reels: scored,
    nextCursor,
    hasMore: snap.docs.length === FETCH_BATCH,
  }
}

/**
 * Fetch author profiles for a list of reels.
 * Batches getDoc calls, deduplicates by uid.
 */
export async function loadReelAuthors(reels, existingMap = {}) {
  const missingUids = [...new Set(reels.map(r => r.authorId))]
    .filter(uid => !existingMap[uid])

  if (!missingUids.length) return {}

  const docs = await Promise.all(
    missingUids.map(uid => getDoc(doc(db, 'users', uid)))
  )
  const result = {}
  docs.forEach((d, i) => {
    if (d.exists()) result[missingUids[i]] = { uid: d.id, ...d.data() }
  })
  return result
}
