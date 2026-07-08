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
  getCountFromServer,
} from 'firebase/firestore'
import { db } from './config'

// ─── Follow a user ────────────────────────────────────────────
export async function followUser(followerId, followeeId) {
  const followId = `${followerId}_${followeeId}`
  // Write the follow document first
  await setDoc(doc(db, 'follows', followId), {
    followerId,
    followeeId,
    createdAt: serverTimestamp(),
  })
  // Increment counters — these may fail if rules are not yet deployed,
  // so we catch individually and don't block the follow from succeeding
  try {
    await updateDoc(doc(db, 'users', followerId), { followingCount: increment(1) })
  } catch {}
  try {
    await updateDoc(doc(db, 'users', followeeId), { followerCount: increment(1) })
  } catch {}
}

// ─── Unfollow a user ──────────────────────────────────────────
export async function unfollowUser(followerId, followeeId) {
  await deleteDoc(doc(db, 'follows', `${followerId}_${followeeId}`))
  try {
    await updateDoc(doc(db, 'users', followerId), { followingCount: increment(-1) })
  } catch {}
  try {
    await updateDoc(doc(db, 'users', followeeId), { followerCount: increment(-1) })
  } catch {}
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

// ─── Get full profiles of followers ──────────────────────────
export async function getFollowerProfiles(uid) {
  const ids = await getFollowerIds(uid)
  if (!ids.length) return []
  const profiles = await Promise.all(ids.map(id => getDoc(doc(db, 'users', id))))
  return profiles
    .filter(s => s.exists())
    .map(s => ({ uid: s.id, ...s.data() }))
}

// ─── Get full profiles of people this user follows ───────────
export async function getFollowingProfiles(uid) {
  const ids = await getFollowingIds(uid)
  if (!ids.length) return []
  const profiles = await Promise.all(ids.map(id => getDoc(doc(db, 'users', id))))
  return profiles
    .filter(s => s.exists())
    .map(s => ({ uid: s.id, ...s.data() }))
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

// ─── Sync Follow/Following Counts (Self-Healing) ──────────────
export async function syncFollowCounts(uid) {
  try {
    const followerQuery = query(collection(db, 'follows'), where('followeeId', '==', uid))
    const followingQuery = query(collection(db, 'follows'), where('followerId', '==', uid))
    
    const [followerSnap, followingSnap] = await Promise.all([
      getCountFromServer(followerQuery),
      getCountFromServer(followingQuery)
    ])
    
    const actualFollowerCount = followerSnap.data().count
    const actualFollowingCount = followingSnap.data().count
    
    // Get current user profile
    const userDocRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userDocRef)
    
    if (userSnap.exists()) {
      const userData = userSnap.data()
      if (userData.followerCount !== actualFollowerCount || userData.followingCount !== actualFollowingCount) {
        await updateDoc(userDocRef, {
          followerCount: actualFollowerCount,
          followingCount: actualFollowingCount
        })
        console.log(`Synced follow counts for ${uid}: Followers=${actualFollowerCount}, Following=${actualFollowingCount}`)
      }
    }
    return { followerCount: actualFollowerCount, followingCount: actualFollowingCount }
  } catch (err) {
    console.error('Error syncing follow counts:', err)
    return null
  }
}

