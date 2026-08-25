import {
  collection,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
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
 * Create a notification for another user.
 * Stored inside the open 'likes' collection (same proven strategy as calls and reactions).
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

  const notifId = `notif_${toUid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    isNotification: true,
    notifId,
    notifToUid:   toUid,
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
    createdAt:    Date.now(),
  }

  try {
    await setDoc(doc(db, 'likes', notifId), payload)
  } catch (err) {
    console.warn('createNotification error:', err?.message)
  }
}

/**
 * Real-time notifications list for a user.
 * Listens to open 'likes' collection where notifToUid == uid.
 */
export function listenNotifications(uid, cb) {
  if (!uid) { cb([]); return () => {} }

  const q = query(
    collection(db, 'likes'),
    where('notifToUid', '==', uid),
  )

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.isNotification)
      // Sort newest first in memory
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
    const q = query(
      collection(db, 'likes'),
      where('notifToUid', '==', uid),
    )
    const snap = await getDocs(q)
    const unreadDocs = snap.docs.filter(d => d.data().isNotification && d.data().read === false)
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
export async function deleteNotification(id) {
  if (!id) return
  try {
    await deleteDoc(doc(db, 'likes', id))
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
    const q = query(
      collection(db, 'likes'),
      where('notifToUid', '==', uid),
    )
    const snap = await getDocs(q)
    const notifDocs = snap.docs.filter(d => d.data().isNotification)
    if (notifDocs.length === 0) return

    const batch = writeBatch(db)
    notifDocs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  } catch (err) {
    console.warn('clearAllNotifications error:', err?.message)
  }
}
