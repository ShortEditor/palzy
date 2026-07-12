import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
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

// ─── Create user profile on first login ──────────────────────
export async function createUserProfile(uid, { username, name, photoURL, branch, year, bio = '' }) {
  await setDoc(doc(db, 'users', uid), {
    username: username.toLowerCase(),
    name,
    photoURL: photoURL || '',
    branch,
    year,
    bio,
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

// ─── Update profile fields ───────────────────────────────────
export async function updateUserProfile(uid, updates) {
  const cleanUpdates = {}
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      cleanUpdates[key] = updates[key]
    }
  })
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
