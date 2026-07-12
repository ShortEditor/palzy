import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { db } from './config'
import { getUserProfile, updateStreak } from './users'

const POSTS_PER_PAGE = 15

// ─── Create a new post ───────────────────────────────────────
export async function createPost({ authorId, content, imageURL = null, quoteMetadata = null, tags = [] }) {
  const author = await getUserProfile(authorId)
  const type = quoteMetadata ? 'quote' : (imageURL ? 'image' : 'text')
  const postRef = await addDoc(collection(db, 'posts'), {
    authorId,
    authorName: author?.name ?? '',
    authorUsername: author?.username ?? '',
    authorPhotoURL: author?.photoURL ?? '',
    authorIsVerified: author?.isVerified ?? false,
    authorBranch: author?.branch ?? '',
    authorYear: author?.year ?? '',
    type,
    content: content?.trim() ?? '',
    imageURL,
    tags: tags.length > 0 ? tags : [],
    ...(quoteMetadata ? { quoteMetadata } : {}),
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  })
  const snap = await getDoc(postRef)
  // Fire-and-forget streak update (non-blocking)
  updateStreak(authorId).catch(() => {})
  return { id: snap.id, ...snap.data() }
}

// ─── Delete a post (own posts only, enforced by security rules) ───
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── Hybrid ranked feed ──────────────────────────────────────
// 1. Posts from followed users (+ self)
// 2. Fill with trending posts from non-followed users
// 3. Client-side score: likeCount×3 + commentCount×2 + recencyBonus
// Firestore 'in' queries are capped at 30 UIDs — we batch as needed
const FEED_POOL_SIZE   = 60   // raw posts fetched before scoring
const FEED_PAGE_SIZE   = 15   // posts returned per call
const TRENDING_FILL    = 20   // trending posts to pad the pool

function scorePost(post) {
  const ageMs = Date.now() - (post.createdAt?.toMillis?.() ?? Date.now())
  const ageHours = ageMs / 3_600_000
  const recencyBonus = Math.max(0, 50 - ageHours) // decays to 0 at 50h
  return (post.likeCount ?? 0) * 3 + (post.commentCount ?? 0) * 2 + recencyBonus
}

export async function getFeedPosts(cursor = null, currentUid = null, followingIds = []) {
  const seenIds = new Set()
  const pool = []

  // ── 1. Followed + self ────────────────────────────────────
  const feedUids = currentUid
    ? [...new Set([currentUid, ...followingIds])].slice(0, 90)
    : []

  if (feedUids.length > 0) {
    // Firestore 'in' limit = 30; batch if needed
    const batches = []
    for (let i = 0; i < feedUids.length; i += 30) {
      batches.push(feedUids.slice(i, i + 30))
    }
    const batchResults = await Promise.all(
      batches.map(batch => {
        const q = query(
          collection(db, 'posts'),
          where('authorId', 'in', batch),
          orderBy('createdAt', 'desc'),
          limit(FEED_POOL_SIZE),
        )
        return getDocs(q)
      })
    )
    batchResults.forEach(snap => {
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id)
          pool.push({ id: d.id, ...d.data(), _isFollowed: true })
        }
      })
    })
  }

  // ── 2. Trending fill (non-followed) ────────────────────────
  const trendingQ = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(FEED_POOL_SIZE),
  )
  const trendingSnap = await getDocs(trendingQ)
  trendingSnap.docs.forEach(d => {
    if (!seenIds.has(d.id)) {
      seenIds.add(d.id)
      pool.push({ id: d.id, ...d.data(), _isFollowed: false })
    }
  })

  // ── 3. Score + sort ────────────────────────────────────────
  // Followed posts get a +15 score boost to naturally surface first
  const scored = pool.map(p => ({ ...p, _score: scorePost(p) + (p._isFollowed ? 15 : 0) }))
  scored.sort((a, b) => b._score - a._score)

  // ── 4. Cursor-based pagination (index into sorted array) ───
  const startIndex = cursor ?? 0
  const page = scored.slice(startIndex, startIndex + FEED_PAGE_SIZE)
  const nextCursor = startIndex + FEED_PAGE_SIZE
  const hasMore = nextCursor < scored.length

  return { posts: page, nextCursor, hasMore }
}

// ─── Get posts by a specific user ────────────────────────────
export async function getUserPosts(userId, cursor = null) {
  let q = query(
    collection(db, 'posts'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE),
  )
  if (cursor) {
    q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(POSTS_PER_PAGE),
    )
  }
  const snap = await getDocs(q)
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const nextCursor = snap.docs[snap.docs.length - 1] ?? null
  return { posts, nextCursor, hasMore: snap.docs.length === POSTS_PER_PAGE }
}

// ─── Get a single post ───────────────────────────────────────
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// ─── Like / Unlike (atomic transaction) ─────────────────────
export async function toggleLike(postId, userId) {
  const likeId  = `${postId}_${userId}`
  const likeRef = doc(db, 'likes', likeId)
  const postRef = doc(db, 'posts', postId)

  return runTransaction(db, async tx => {
    const likeSnap = await tx.get(likeRef)
    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likeCount: increment(-1) })
      return false // now unliked
    } else {
      tx.set(likeRef, { postId, userId, createdAt: serverTimestamp() })
      tx.update(postRef, { likeCount: increment(1) })
      return true // now liked
    }
  })
}

// ─── Check if current user liked a post ──────────────────────
export async function isLikedByUser(postId, userId) {
  const snap = await getDoc(doc(db, 'likes', `${postId}_${userId}`))
  return snap.exists()
}

// ─── Batch-check likes for a list of postIds ────────────────
export async function batchCheckLikes(postIds, userId) {
  const results = {}
  await Promise.all(
    postIds.map(async pid => {
      const snap = await getDoc(doc(db, 'likes', `${pid}_${userId}`))
      results[pid] = snap.exists()
    })
  )
  return results
}

// ─── Add a comment (two writes — addDoc can't be in a transaction) ───
export async function addCommentToPost(postId, { authorId, text }) {
  const author = await getUserProfile(authorId)
  const commentsRef = collection(db, 'posts', postId, 'comments')
  const postRef     = doc(db, 'posts', postId)

  // Write comment then increment counter
  const commentRef = await addDoc(commentsRef, {
    authorId,
    authorName: author?.name ?? '',
    authorUsername: author?.username ?? '',
    authorPhotoURL: author?.photoURL ?? '',
    authorIsVerified: author?.isVerified ?? false,
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
  await updateDoc(postRef, { commentCount: increment(1) })

  const snap = await getDoc(commentRef)
  return { id: snap.id, ...snap.data() }
}

// ─── Get comments for a post ─────────────────────────────────
export async function getComments(postId) {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Delete a comment ─────────────────────────────────────────
export async function deleteComment(postId, commentId) {
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId))
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) })
}
