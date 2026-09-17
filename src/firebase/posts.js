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
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import { getUserProfile, updateStreak } from './users'
import { createNotification } from './notifications'

/** Extract #hashtags from post text (lowercase, unique, max 10) */
function extractHashtags(text) {
  if (!text) return []
  const matches = text.match(/#([a-z0-9_]{1,30})/gi) || []
  return [...new Set(matches.map(h => h.slice(1).toLowerCase()))].slice(0, 10)
}

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
    hashtags: extractHashtags(content?.trim() ?? ''),
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
const FEED_POOL_SIZE   = 80   // raw posts fetched before scoring
const FEED_PAGE_SIZE   = 5    // posts returned per call

// Session cache: scored pool is built once per refresh, paginated from memory
let _cachedPool   = []
let _cacheSession = null  // unique key per session (reset on refresh / cursor=null)

function scorePost(post, sessionSeed) {
  const ageMs    = Date.now() - (post.createdAt?.toMillis?.() ?? Date.now())
  const ageHours = ageMs / 3_600_000

  // ── Recency: strong boost for <6h, smooth decay to 0 at 72h ──
  const recencyBonus = ageHours < 6
    ? 60 - ageHours * 2            // 60→48 in first 6 hours
    : Math.max(0, 48 * Math.exp(-0.04 * (ageHours - 6)))  // exponential decay

  // ── Engagement signals ──
  const likes    = post.likeCount    ?? 0
  const comments = post.commentCount ?? 0
  const engagement = likes * 3 + comments * 4

  // ── Engagement density: engagement-per-hour (rewards quick virality) ──
  const density = ageHours > 0.5 ? (likes + comments) / ageHours : (likes + comments) * 2

  // ── Content type boost: visual posts get +8, quotes +5 ──
  const typeBoost = post.type === 'image' ? 8
                  : post.type === 'quote' ? 5
                  : 0

  // ── Follow boost ──
  const followBoost = post._isFollowed ? 20 : 0

  // ── Controlled randomness: jitter ±12 so refreshes feel fresh ──
  // Uses a deterministic-ish hash per post+session so pagination stays stable
  const hash = simpleHash(post.id + sessionSeed)
  const jitter = (hash % 2400 - 1200) / 100  // range: -12 to +12

  return recencyBonus + engagement + density * 2 + typeBoost + followBoost + jitter
}

/** Simple numeric hash for deterministic randomness within a session */
function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export async function getFeedPosts(cursor = null, currentUid = null, followingIds = []) {
  // ── Return from cache on paginated requests ──
  if (cursor !== null && _cachedPool.length > 0) {
    const startIndex = cursor
    const page = _cachedPool.slice(startIndex, startIndex + FEED_PAGE_SIZE)
    const nextCursor = startIndex + FEED_PAGE_SIZE
    const hasMore = nextCursor < _cachedPool.length
    return { posts: page, nextCursor, hasMore }
  }

  // ── Fresh fetch (first load or refresh) ──
  const sessionSeed = String(Date.now()) + Math.random().toString(36).slice(2)
  const seenIds = new Set()
  const pool = []

  // ── 1. Followed + self ────────────────────────────────────
  const feedUids = currentUid
    ? [...new Set([currentUid, ...followingIds])].slice(0, 90)
    : []

  if (feedUids.length > 0) {
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
  const scored = pool.map(p => {
    const s = scorePost(p, sessionSeed)
    // Clean internal flags before returning
    const { _isFollowed, ...clean } = p
    return { ...clean, _score: s }
  })
  scored.sort((a, b) => b._score - a._score)

  // ── 4. Cache for this session & return first page ──────────
  _cachedPool = scored
  _cacheSession = sessionSeed

  const page = scored.slice(0, FEED_PAGE_SIZE)
  const nextCursor = FEED_PAGE_SIZE
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

  const result = await runTransaction(db, async tx => {
    const [likeSnap, postSnap] = await Promise.all([tx.get(likeRef), tx.get(postRef)])
    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likeCount: increment(-1) })
      return false // unliked
    } else {
      tx.set(likeRef, { postId, userId, createdAt: serverTimestamp() })
      tx.update(postRef, { likeCount: increment(1) })
      return { authorId: postSnap.data()?.authorId, content: postSnap.data()?.content }
    }
  })

  // Fire notification (non-blocking)
  if (result && result.authorId && result.authorId !== userId) {
    getUserProfile(userId)
      .then(liker => {
        createNotification(result.authorId, {
          type: 'like',
          fromUid: userId,
          fromName: liker?.name || 'Someone',
          fromUsername: liker?.username || '',
          fromPhotoURL: liker?.photoURL || '',
          postId,
          postContent: result.content || '',
        })
      })
      .catch(() => {
        createNotification(result.authorId, {
          type: 'like',
          fromUid: userId,
          fromName: 'Someone',
          postId,
          postContent: result.content || '',
        })
      })
  }

  return result !== false
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

// ─── Add a comment or reply ──────────────────────────────────
// parentId = null means top-level; parentId = commentId means a reply
export async function addCommentToPost(postId, { authorId, text, parentId = null, postAuthorId = null }) {
  const author = await getUserProfile(authorId)
  const commentsRef = collection(db, 'posts', postId, 'comments')
  const postRef     = doc(db, 'posts', postId)

  const commentRef = await addDoc(commentsRef, {
    authorId,
    authorName: author?.name ?? '',
    authorUsername: author?.username ?? '',
    authorPhotoURL: author?.photoURL ?? '',
    authorIsVerified: author?.isVerified ?? false,
    text: text.trim(),
    parentId: parentId ?? null,
    createdAt: serverTimestamp(),
  })
  await updateDoc(postRef, { commentCount: increment(1) })

  // Find target author to notify
  let targetAuthorId = postAuthorId
  if (!targetAuthorId) {
    try {
      const pSnap = await getDoc(postRef)
      targetAuthorId = pSnap.data()?.authorId
    } catch {}
  }

  // Fire notification for comment/reply on post (non-blocking)
  if (targetAuthorId && targetAuthorId !== authorId) {
    createNotification(targetAuthorId, {
      type: parentId ? 'reply' : 'comment',
      fromUid: authorId,
      fromName: author?.name || 'Someone',
      fromUsername: author?.username || '',
      fromPhotoURL: author?.photoURL || '',
      postId,
      commentText: text.trim(),
    }).catch(() => {})
  }

  const snap = await getDoc(commentRef)
  return { id: snap.id, ...snap.data() }
}

// ─── Get comments for a post (flat, sorted asc) ──────────────
export async function getComments(postId) {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Delete a comment + cascade all replies ───────────────────
export async function deleteComment(postId, commentId) {
  const repliesQ = query(
    collection(db, 'posts', postId, 'comments'),
    where('parentId', '==', commentId)
  )
  const repliesSnap = await getDocs(repliesQ)

  const batch = writeBatch(db)
  repliesSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(doc(db, 'posts', postId, 'comments', commentId))
  const totalDeleted = repliesSnap.docs.length + 1
  batch.update(doc(db, 'posts', postId), { commentCount: increment(-totalDeleted) })

  await batch.commit()
  return totalDeleted
}
