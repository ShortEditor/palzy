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

const POSTS_PER_PAGE = 15

// ─── Create a new post ───────────────────────────────────────
export async function createPost({ authorId, content, imageURL = null, quoteMetadata = null }) {
  const type = quoteMetadata ? 'quote' : (imageURL ? 'image' : 'text')
  const postRef = await addDoc(collection(db, 'posts'), {
    authorId,
    type,
    content: content?.trim() ?? '',
    imageURL,
    ...(quoteMetadata ? { quoteMetadata } : {}),
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  })
  return postRef.id
}

// ─── Delete a post (own posts only, enforced by security rules) ───
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── Get paginated feed posts (cursor-based) ─────────────────
export async function getFeedPosts(cursor = null) {
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE),
  )
  if (cursor) {
    q = query(
      collection(db, 'posts'),
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
  const commentsRef = collection(db, 'posts', postId, 'comments')
  const postRef     = doc(db, 'posts', postId)

  // Write comment then increment counter
  await addDoc(commentsRef, {
    authorId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
  await updateDoc(postRef, { commentCount: increment(1) })
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
