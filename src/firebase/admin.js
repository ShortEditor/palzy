import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  where,
  getDoc,
} from 'firebase/firestore'
import { db } from './config'

// ─── Check if a user is admin ────────────────────────────────
export async function checkIsAdmin(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data().isAdmin === true) : false
}

// ─── Dashboard stats ─────────────────────────────────────────
export async function getAdminStats() {
  const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'posts')),
    getCountFromServer(collection(db, 'reports')),
  ])
  return {
    totalUsers:   usersSnap.data().count,
    totalPosts:   postsSnap.data().count,
    totalReports: reportsSnap.data().count,
  }
}

// ─── Get all users (paginated) ───────────────────────────────
export async function getAdminUsers(cursor = null, pageSize = 20) {
  let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize))
  if (cursor) q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
  const snap = await getDocs(q)
  const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
  return { users, nextCursor: snap.docs[snap.docs.length - 1] ?? null, hasMore: snap.docs.length === pageSize }
}

// ─── Ban / Unban a user ──────────────────────────────────────
export async function setUserBanned(uid, banned) {
  await updateDoc(doc(db, 'users', uid), { banned })
}

// ─── Get all posts (paginated, admin view) ───────────────────
export async function getAdminPosts(cursor = null, pageSize = 20) {
  let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize))
  if (cursor) q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
  const snap = await getDocs(q)
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return { posts, nextCursor: snap.docs[snap.docs.length - 1] ?? null, hasMore: snap.docs.length === pageSize }
}

// ─── Admin delete any post ───────────────────────────────────
export async function adminDeletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── Get reported posts ──────────────────────────────────────
export async function getReports(cursor = null, pageSize = 20) {
  let q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(pageSize))
  if (cursor) q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
  const snap = await getDocs(q)
  const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return { reports, nextCursor: snap.docs[snap.docs.length - 1] ?? null, hasMore: snap.docs.length === pageSize }
}

// ─── Dismiss a report ───────────────────────────────────────
export async function dismissReport(reportId) {
  await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' })
}

// ─── Delete post via report ──────────────────────────────────
export async function resolveReport(reportId, postId) {
  await deleteDoc(doc(db, 'posts', postId))
  await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' })
}

// ─── File a report (called from PostCard) ────────────────────
export async function reportPost(postId, reportedBy, reason) {
  // Prevent duplicate reports from same user
  const existing = await getDocs(
    query(collection(db, 'reports'), where('postId', '==', postId), where('reportedBy', '==', reportedBy))
  )
  if (!existing.empty) return false
  await addDoc(collection(db, 'reports'), {
    postId,
    reportedBy,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return true
}
