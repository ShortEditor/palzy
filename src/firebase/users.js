import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// ─── Check if a username is already taken ────────────────────
export async function isUsernameTaken(username) {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username.toLowerCase()),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// ─── Check if a college PIN is already claimed ───────────────
export async function isCollegePinTaken(pin) {
  const q = query(
    collection(db, 'users'),
    where('collegePin', '==', pin.trim().toUpperCase()),
    limit(1),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// ─── Create user profile on first login ──────────────────────
export async function createUserProfile(uid, { username, name, photoURL, branch, year, bio = '', showBranch = true, showYear = true, collegePin = '' }) {
  await setDoc(doc(db, 'users', uid), {
    username: username.toLowerCase(),
    name,
    photoURL: photoURL || '',
    branch: branch || '',
    year: year || '',
    bio,
    showBranch,
    showYear,
    collegePin: collegePin ? collegePin.trim().toUpperCase() : '',
    followerCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
  })
}

const profileCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ─── Get user profile by UID (with 5-min memory caching) ──────
export async function getUserProfile(uid) {
  const cached = profileCache.get(uid)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }

  const snap = await getDoc(doc(db, 'users', uid))
  const profile = snap.exists() ? { uid: snap.id, ...snap.data() } : null
  profileCache.set(uid, { data: profile, time: Date.now() })
  return profile
}

export function invalidateUserCache(uid) {
  profileCache.delete(uid)
}

// ─── Allowed fields for profile updates (blocks privilege escalation) ─────
const ALLOWED_PROFILE_FIELDS = new Set([
  'name', 'username', 'photoURL', 'bannerURL', 'bio',
  'branch', 'year', 'showBranch', 'showYear', 'collegePin',
  'stories', 'streakCount', 'streakLastDate', 'streakBestEver',
  'followerCount', 'followingCount',
])

// ─── Update profile fields ───────────────────────────────────
export async function updateUserProfile(uid, updates) {
  const cleanUpdates = {}
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined && ALLOWED_PROFILE_FIELDS.has(key)) {
      cleanUpdates[key] = updates[key]
    }
  })
  if (Object.keys(cleanUpdates).length === 0) return
  await updateDoc(doc(db, 'users', uid), cleanUpdates)
  invalidateUserCache(uid)
}

// ─── Get user by username ────────────────────────────────────
export async function getUserByUsername(username) {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username.toLowerCase()),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { uid: d.id, ...d.data() }
}

// ─── Update daily posting streak ─────────────────────────────
// Call once per createPost. Safe to call multiple times per day.
export async function updateStreak(uid) {
  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return

  const { streakCount = 0, streakLastDate = null, streakBestEver = 0 } = snap.data()

  // Already posted today — nothing to update
  if (streakLastDate === today) return

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const newCount = streakLastDate === yesterdayStr ? streakCount + 1 : 1
  const newBest  = Math.max(streakBestEver, newCount)

  await updateDoc(userRef, {
    streakCount:    newCount,
    streakLastDate: today,
    streakBestEver: newBest,
  })
  invalidateUserCache(uid)
}

// ─── Fast search with memory caching & token matching ──────────────
let usersSearchCache = null
let usersCacheTime = 0

export async function getAllUsersForSearch() {
  const now = Date.now()
  if (usersSearchCache && now - usersCacheTime < 300000) { // 5 min cache
    return usersSearchCache
  }
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(300)))
    usersSearchCache = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
    usersCacheTime = now
    return usersSearchCache
  } catch (err) {
    console.error('getAllUsersForSearch error:', err)
    return usersSearchCache || []
  }
}

export function filterUsersLocally(users, rawQuery, currentUid, limitCount = 20) {
  const tokens = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (!tokens.length) {
    return users.filter(u => u.uid !== currentUid).slice(0, limitCount)
  }

  return users
    .filter(u => {
      if (u.uid === currentUid) return false
      const name = (u.name || '').toLowerCase()
      const username = (u.username || '').toLowerCase()
      const branch = (u.branch || '').toLowerCase()

      // Every search token must match either name, username, or branch
      return tokens.every(token => name.includes(token) || username.includes(token) || branch.includes(token))
    })
    .slice(0, limitCount)
}

export async function searchUsers(rawQuery, limitCount = 20) {
  const allUsers = await getAllUsersForSearch()
  return filterUsersLocally(allUsers, rawQuery, null, limitCount)
}



