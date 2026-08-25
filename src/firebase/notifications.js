import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  limit,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

function getMillis(ts) {
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (ts.toMillis) return ts.toMillis()
  if (ts.seconds) return ts.seconds * 1000
  if (ts instanceof Date) return ts.getTime()
  return 0
}

/**
 * Create a notification for another user in their items subcollection:
 * /notifications/{toUid}/items/{docId}
 * type: 'like' | 'reaction' | 'comment' | 'reply' | 'follow' | 'mention' | 'call'
 */
export async function createNotification(toUid, {
  type,
  fromUid,
  fromName,
  fromUsername,
  fromPhotoURL,
  postId,
  postContent,
  commentText,
  emoji,
}) {
  if (!toUid || !fromUid || toUid === fromUid) return // never self-notify

  const payload = {
    type:         type         || 'like',
    fromUid,
    fromName:     fromName     || '',
    fromUsername: fromUsername || '',
    fromPhotoURL: fromPhotoURL || '',
    postId:       postId       || null,
    postContent:  postContent  ? String(postContent).slice(0, 80) : null,
    commentText:  commentText  ? String(commentText).slice(0, 80) : null,
    emoji:        emoji        || null,
    read:         false,
    createdAt:    serverTimestamp(),
  }

  try {
    await addDoc(collection(db, 'notifications', toUid, 'items'), payload)
  } catch (err) {
    console.warn('createNotification error:', err?.message)
  }
}

/**
 * Real-time notifications list for a user.
 * Returns an unsubscribe function.
 */
export function listenNotifications(uid, cb) {
  if (!uid) { cb([]); return () => {} }

  const q = query(
    collection(db, 'notifications', uid, 'items'),
    limit(50),
  )

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort newest first in memory to avoid missing Firestore index errors
      items.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
      cb(items)
    },
    (err) => {
      console.warn('listenNotifications error:', err?.message)
      cb([])
    }
  )
}

/**
 * Real-time unread count.
 * Returns unsubscribe fn.
 */
export function listenUnreadCount(uid, cb) {
  if (!uid) return () => {}
  return listenNotifications(uid, (items) => {
    const unread = items.filter(n => !n.read).length
    cb(unread)
  })
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllRead(uid) {
  if (!uid) return
  try {
    const snap = await getDocs(query(collection(db, 'notifications', uid, 'items'), limit(50)))
    const unreadDocs = snap.docs.filter(d => d.data().read === false)
    if (unreadDocs.length === 0) return

    const batch = writeBatch(db)
    unreadDocs.forEach(d => batch.update(d.ref, { read: true }))
    await batch.commit()
  } catch (err) {
    console.warn('markAllRead error:', err?.message)
  }
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(id, uid) {
  if (!id || !uid) return
  try {
    await deleteDoc(doc(db, 'notifications', uid, 'items', id))
  } catch (err) {
    console.warn('deleteNotification error:', err?.message)
  }
}

/**
 * Clear all notifications for a user.
 */
export async function clearAllNotifications(uid) {
  if (!uid) return
  try {
    const snap = await getDocs(query(collection(db, 'notifications', uid, 'items'), limit(100)))
    if (!snap.empty) {
      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (err) {
    console.warn('clearAllNotifications error:', err?.message)
  }
}
