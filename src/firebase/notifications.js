import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
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
 * Create a notification for another user.
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
    toUid,
    fromUid,
    fromName:     fromName     || '',
    fromUsername: fromUsername || '',
    fromPhotoURL: fromPhotoURL || '',
    type:         type         || 'like',
    postId:       postId       || null,
    postContent:  postContent  ? String(postContent).slice(0, 80) : null,
    commentText:  commentText  ? String(commentText).slice(0, 80) : null,
    emoji:        emoji        || null,
    read:         false,
    createdAt:    serverTimestamp(),
  }

  // 1. Write to top-level 'notifications' collection (primary)
  try {
    await addDoc(collection(db, 'notifications'), payload)
  } catch (err) {
    console.warn('createNotification top-level error:', err?.message)
  }

  // 2. Also write to subcollection for backward compatibility
  try {
    await addDoc(collection(db, 'notifications', toUid, 'items'), payload)
  } catch (err) {
    console.warn('createNotification subcollection error:', err?.message)
  }
}

/**
 * Real-time notifications list for a user.
 * Returns an unsubscribe function.
 */
export function listenNotifications(uid, cb) {
  if (!uid) { cb([]); return () => {} }

  // Listen to top-level notifications filtered by toUid
  const qTop = query(
    collection(db, 'notifications'),
    where('toUid', '==', uid),
    limit(50),
  )

  let unsubSub = null
  let topReceived = false

  const unsubTop = onSnapshot(
    qTop,
    (snap) => {
      topReceived = true
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
        cb(items)
      } else {
        // Top-level is empty, check legacy subcollection
        if (!unsubSub) {
          const qSub = query(collection(db, 'notifications', uid, 'items'), limit(50))
          unsubSub = onSnapshot(
            qSub,
            (subSnap) => {
              const items = subSnap.docs.map(d => ({ id: d.id, ...d.data() }))
              items.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
              cb(items)
            },
            () => cb([])
          )
        } else {
          cb([])
        }
      }
    },
    (err) => {
      console.warn('Top-level notifications error, using subcollection:', err?.message)
      if (!unsubSub) {
        const qSub = query(collection(db, 'notifications', uid, 'items'), limit(50))
        unsubSub = onSnapshot(
          qSub,
          (subSnap) => {
            const items = subSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            items.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
            cb(items)
          },
          () => cb([])
        )
      }
    }
  )

  return () => {
    unsubTop()
    if (unsubSub) unsubSub()
  }
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

  // Mark top-level notifications read
  try {
    const qTop = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      where('read', '==', false),
      limit(50),
    )
    const snapTop = await getDocs(qTop)
    if (!snapTop.empty) {
      const batch = writeBatch(db)
      snapTop.docs.forEach(d => batch.update(d.ref, { read: true }))
      await batch.commit()
    }
  } catch (err) {
    console.warn('markAllRead top-level error:', err?.message)
  }

  // Mark legacy subcollection read
  try {
    const qSub = query(
      collection(db, 'notifications', uid, 'items'),
      where('read', '==', false),
      limit(50),
    )
    const snapSub = await getDocs(qSub)
    if (!snapSub.empty) {
      const batch = writeBatch(db)
      snapSub.docs.forEach(d => batch.update(d.ref, { read: true }))
      await batch.commit()
    }
  } catch (err) {
    console.warn('markAllRead subcollection error:', err?.message)
  }
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(id, uid) {
  if (!id) return
  try {
    await deleteDoc(doc(db, 'notifications', id))
  } catch {}
  if (uid) {
    try {
      await deleteDoc(doc(db, 'notifications', uid, 'items', id))
    } catch {}
  }
}

/**
 * Clear all notifications for a user.
 */
export async function clearAllNotifications(uid) {
  if (!uid) return
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      limit(100),
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (err) {
    console.warn('clearAllNotifications error:', err?.message)
  }
}
