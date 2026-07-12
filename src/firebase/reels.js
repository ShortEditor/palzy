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
 * Score = (likeCount×2 + commentCount×3 + recencyBonus) × random jitter
 *
 * The random jitter (0.6–1.4) means popular posts generally surface first
 * but the exact order changes on every refresh — feels alive, not static.
 *
 * Fetches a pool of 40 posts and client-side ranks them.
 */
export async function getReelsFeed(cursor = null, seenIds = new Set()) {
  // Larger pool = more variety per session
  const FETCH_BATCH = REELS_PER_PAGE * 8

  let q = query(
    collection(db, 'posts'),
    where('imageURL', '!=', null),
    orderBy('imageURL'),
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

  const scored = snap.docs
    .filter(d => !seenIds.has(d.id))
    .map(d => {
      const data = d.data()
      const ageHours = (now - (data.createdAt?.toMillis?.() ?? now)) / MS_PER_HOUR
      // Recency bonus: decays over 48h
      const recencyBonus = Math.pow(0.97, ageHours)
      const baseScore = (data.likeCount ?? 0) * 2 +
                        (data.commentCount ?? 0) * 3 +
                        recencyBonus * 10
      // Random jitter: 60%–140% of base score → reshuffles every refresh
      // while still broadly respecting engagement ranking
      const jitter = 0.6 + Math.random() * 0.8
      return { id: d.id, _snap: d, score: baseScore * jitter, ...data }
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
