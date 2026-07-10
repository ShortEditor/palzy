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

// ─── Suggest people to follow (branch-based fallback) ─────────
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

// ─── Friend Recommendation Engine ────────────────────────────
// Friends-of-friends: scores candidates by mutual connection count
// Returns array of { uid, name, username, photoURL, ...profile, mutualCount, mutualSamples }
export async function getRecommendations(currentUid, count = 10) {
  // 1. Who does the current user follow?
  const myFollowingIds = await getFollowingIds(currentUid)
  const exclude = new Set([currentUid, ...myFollowingIds])

  if (myFollowingIds.length === 0) {
    // New user — fall back to recent users
    const snap = await getDocs(query(collection(db, 'users'), limit(count + 5)))
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data(), mutualCount: 0, mutualSamples: [] }))
      .filter(u => !exclude.has(u.uid))
      .slice(0, count)
  }

  // 2. For each person I follow, get who THEY follow (friends-of-friends)
  const candidateScore = {}  // uid → mutual count
  const candidateMutuals = {} // uid → [mutual uid, ...]

  const followingLists = await Promise.all(
    myFollowingIds.slice(0, 15).map(uid => getFollowingIds(uid)) // cap at 15 to limit reads
  )

  followingLists.forEach((friendsFollowing, i) => {
    const mutualUid = myFollowingIds[i]
    friendsFollowing.forEach(candidateUid => {
      if (exclude.has(candidateUid)) return // already following or self
      candidateScore[candidateUid] = (candidateScore[candidateUid] ?? 0) + 1
      if (!candidateMutuals[candidateUid]) candidateMutuals[candidateUid] = []
      if (!candidateMutuals[candidateUid].includes(mutualUid)) {
        candidateMutuals[candidateUid].push(mutualUid)
      }
    })
  })

  // 3. Sort candidates by mutual count
  const sortedCandidates = Object.entries(candidateScore)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count + 5)
    .map(([uid]) => uid)

  if (sortedCandidates.length === 0) {
    // Fallback: same-branch suggestions
    const snap = await getDocs(query(collection(db, 'users'), limit(count + 5)))
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data(), mutualCount: 0, mutualSamples: [] }))
      .filter(u => !exclude.has(u.uid))
      .slice(0, count)
  }

  // 4. Fetch profiles for sorted candidates
  const profileDocs = await Promise.all(
    sortedCandidates.map(uid => getDoc(doc(db, 'users', uid)))
  )

  // 5. Fetch sample mutual profiles (up to 2 per candidate for display)
  const results = []
  for (const snap of profileDocs) {
    if (!snap.exists()) continue
    const uid = snap.id
    const mutualUids = (candidateMutuals[uid] ?? []).slice(0, 2)
    const mutualProfileDocs = await Promise.all(
      mutualUids.map(muid => getDoc(doc(db, 'users', muid)))
    )
    const mutualSamples = mutualProfileDocs
      .filter(s => s.exists())
      .map(s => ({ uid: s.id, ...s.data() }))

    results.push({
      uid,
      ...snap.data(),
      mutualCount: candidateScore[uid] ?? 0,
      mutualSamples,
    })
  }

  return results.slice(0, count)
}

// ─── Get mutual followers between two users ───────────────────
// Returns profiles of users that BOTH currentUid and targetUid follow
export async function getMutuals(currentUid, targetUid) {
  if (!currentUid || !targetUid || currentUid === targetUid) return []
  const [myFollowing, theirFollowers] = await Promise.all([
    getFollowingIds(currentUid),
    getFollowerIds(targetUid),
  ])
  const mySet = new Set(myFollowing)
  const mutualIds = theirFollowers.filter(uid => mySet.has(uid))
  if (mutualIds.length === 0) return []
  const profileDocs = await Promise.all(
    mutualIds.slice(0, 3).map(uid => getDoc(doc(db, 'users', uid)))
  )
  return profileDocs
    .filter(s => s.exists())
    .map(s => ({ uid: s.id, ...s.data() }))
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

