import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import { createFeedSession, getSessionPage, FEED_PAGE_SIZE } from '../utils/rankedFeed'
import { withPostCounts, invalidatePostCounts } from './counts'
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
export async function createPost({ authorId, content, imageURL = null, imageURLs = null, imageRatio = null, videoURL = null, videoDuration = null, quoteMetadata = null, tags = [] }) {
  const author = await getUserProfile(authorId)

  // Determine post type
  let type = 'text'
  if (quoteMetadata) type = 'quote'
  else if (videoURL) type = 'video'
  else if (imageURLs && imageURLs.length > 1) type = 'carousel'
  else if (imageURL || (imageURLs && imageURLs.length === 1)) type = 'image'

  // For single-image carousel, flatten to legacy imageURL for backward compat
  const finalImageURL = imageURLs?.length === 1 ? imageURLs[0] : imageURL

  const postData = {
    authorId,
    authorName: author?.name ?? '',
    authorUsername: author?.username ?? '',
    authorPhotoURL: author?.photoURL ?? '',
    authorIsVerified: author?.isVerified ?? false,
    authorBranch: author?.branch ?? '',
    authorYear: author?.year ?? '',
    type,
    content: content?.trim() ?? '',
    imageURL: finalImageURL,
    tags: tags.length > 0 ? tags : [],
    hashtags: extractHashtags(content?.trim() ?? ''),
    ...(quoteMetadata ? { quoteMetadata } : {}),
    ...(videoURL ? { videoURL, videoDuration: videoDuration ?? null } : {}),
    // Carousel-specific fields
    ...(imageURLs && imageURLs.length > 1 ? { imageURLs, imageRatio: imageRatio || '1:1' } : {}),
    ...(imageRatio && type === 'image' ? { imageRatio } : {}),
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  }

  const postRef = await addDoc(collection(db, 'posts'), postData)
  invalidateFeedPool()
  const snap = await getDoc(postRef)
  // Fire-and-forget streak update (non-blocking)
  updateStreak(authorId).catch(() => {})
  return { id: snap.id, ...snap.data() }
}

// ─── Delete a post (own posts only, enforced by security rules) ───
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
  invalidateFeedPool()
  invalidatePostCounts(postId)
}

// ─── Small-batch ranked feed ─────────────────────────────────
const FEED_POOL_TTL = 3 * 60 * 1000
let cachedFeed = null

export function invalidateFeedPool() {
  cachedFeed = null
}

export async function getFeedPosts(cursor = null, currentUid = null, followingIds = [], { refresh = false } = {}) {
  const feedUids = [...new Set([currentUid, ...followingIds].filter(Boolean))].slice(0, 90)
  const key = JSON.stringify([currentUid, [...feedUids].sort()])
  let session = cursor?.session
  if (!session) {
    if (!refresh && cachedFeed?.key === key && Date.now() - cachedFeed.time < FEED_POOL_TTL) {
      session = cachedFeed.session
    } else {
      const sources = []
      for (let i = 0; i < feedUids.length; i += 30) sources.push({ uids: feedUids.slice(i, i + 30) })
      sources.push({ uids: null })
      session = createFeedSession({
        sources,
        followingIds: feedUids,
        seed: String(Date.now()) + Math.random().toString(36).slice(2),
        countPosts: posts => withPostCounts(posts, { refresh }),
        readSource: async source => {
          const constraints = []
          if (source.uids) constraints.push(where('authorId', 'in', source.uids))
          constraints.push(orderBy('createdAt', 'desc'))
          if (source.cursor) constraints.push(startAfter(source.cursor))
          constraints.push(limit(FEED_PAGE_SIZE))
          const snap = await getDocs(query(collection(db, 'posts'), ...constraints))
          return { posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
            cursor: snap.docs.at(-1) ?? source.cursor, done: snap.size < FEED_PAGE_SIZE }
        },
      })
      // Publish cache only after a successful first page, below.
    }
  }
  const page = await getSessionPage(session, cursor?.offset ?? 0)
  if (!cursor) cachedFeed = { key, session, time: Date.now() }
  return { posts: await withPostCounts(page.posts), nextCursor: { session, offset: page.nextOffset }, hasMore: page.hasMore }
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
  const posts = await withPostCounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  const nextCursor = snap.docs[snap.docs.length - 1] ?? null
  return { posts, nextCursor, hasMore: snap.docs.length === POSTS_PER_PAGE }
}

// ─── Get a single post ───────────────────────────────────────
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return (await withPostCounts([{ id: snap.id, ...snap.data() }]))[0]
}

// ─── Like / Unlike (atomic transaction) ─────────────────────
export async function toggleLike(postId, userId) {
  const likeId  = `${postId}_${userId}`
  const likeRef = doc(db, 'likes', likeId)
  const postRef = doc(db, 'posts', postId)

  invalidatePostCounts(postId)
  const result = await runTransaction(db, async tx => {
    const [likeSnap, postSnap] = await Promise.all([tx.get(likeRef), tx.get(postRef)])
    if (likeSnap.exists()) {
      tx.delete(likeRef)
      return false // unliked
    } else {
      tx.set(likeRef, { postId, userId, createdAt: serverTimestamp() })
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
  invalidatePostCounts(postId)
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

  await batch.commit()
  invalidatePostCounts(postId)
  return totalDeleted
}
