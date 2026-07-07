import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { db } from './config'

// ─── Follow a user ────────────────────────────────────────────
export async function followUser(followerId, followeeId) {
  const followId = `${followerId}_${followeeId}`
  await setDoc(doc(db, 'follows', followId), {
    followerId,
    followeeId,
    createdAt: serverTimestamp(),
  })
  // Increment counters
  await updateDoc(doc(db, 'users', followerId), { followingCount: increment(1) })
  await updateDoc(doc(db, 'users', followeeId), { followerCount:  increment(1) })
}

// ─── Unfollow a user ──────────────────────────────────────────
export async function unfollowUser(followerId, followeeId) {
  await deleteDoc(doc(db, 'follows', `${followerId}_${followeeId}`))
  await updateDoc(doc(db, 'users', followerId), { followingCount: increment(-1) })
  await updateDoc(doc(db, 'users', followeeId), { followerCount:  increment(-1) })
}

// ─── Check if you follow someone ─────────────────────────────
export async function isFollowing(followerId, followeeId) {
  const snap = await getDoc(doc(db, 'follows', `${followerId}_${followeeId}`))
  return snap.exists()
}

// ─── Get all UIDs this user follows ──────────────────────────
export async function getFollowingIds(uid) {
  const q = query(collection(db, 'follows'), where('followerId', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().followeeId)
}

// ─── Get all UIDs that follow this user ──────────────────────
export async function getFollowerIds(uid) {
  const q = query(collection(db, 'follows'), where('followeeId', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().followerId)
}

// ─── Suggest people to follow ─────────────────────────────────
// Returns up to `count` users from the same branch, excluding self + already following
export async function getSuggestions(currentUid, branch, count = 6) {
  // Get who we already follow
  const followingIds = await getFollowingIds(currentUid)
  const exclude = new Set([currentUid, ...followingIds])

  let users = []

  // 1. Same branch first
  if (branch) {
    const snap = await getDocs(
      query(collection(db, 'users'), where('branch', '==', branch), limit(20))
    )
    users = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => !exclude.has(u.uid))
  }

  // 2. If not enough, fill with recent users
  if (users.length < count) {
    const snap = await getDocs(query(collection(db, 'users'), limit(30)))
    const extras = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => !exclude.has(u.uid) && !users.find(x => x.uid === u.uid))
    users = [...users, ...extras]
  }

  // Shuffle and return up to `count`
  return users
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
}
