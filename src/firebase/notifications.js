import {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  where, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

/**
 * Create a notification for another user.
 * type: 'like' | 'comment' | 'reply' | 'follow' | 'mention'
 */
export async function createNotification(toUid, { type, fromUid, fromName, fromUsername, fromPhotoURL, postId, postContent, commentText }) {
  if (!toUid || !fromUid || toUid === fromUid) return  // never self-notify
  try {
    await addDoc(collection(db, 'notifications', toUid, 'items'), {
      type,
      fromUid,
      fromName:     fromName     || '',
      fromUsername: fromUsername || '',
      fromPhotoURL: fromPhotoURL || '',
      postId:       postId       || null,
      postContent:  postContent  ? String(postContent).slice(0, 80)  : null,
      commentText:  commentText  ? String(commentText).slice(0, 80)  : null,
      read:         false,
      createdAt:    serverTimestamp(),
    })
  } catch (err) {
    // Silently fail — never let notification errors break the main action
    console.warn('createNotification:', err?.message)
  }
}

/** Real-time unread count. Returns unsubscribe fn. */
export function listenUnreadCount(uid, cb) {
  if (!uid) return () => {}
  // Listen to the full list ordered by createdAt, count unread client-side
  // (avoids needing a composite index on the subcollection for read==false)
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  return onSnapshot(q,
    snap => cb(snap.docs.filter(d => d.data().read === false).length),
    () => cb(0)
  )
}

/** Real-time notifications list (newest 50). Returns unsubscribe fn. */
export function listenNotifications(uid, cb) {
  if (!uid) { cb([]); return () => {} }
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([]))
}

/** Mark all unread notifications as read (batch write). */
export async function markAllRead(uid) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
    limit(50),
  )
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.update(d.ref, { read: true }))
  await batch.commit()
}
