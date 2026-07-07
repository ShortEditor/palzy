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

// ─── Get user profile by UID ─────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() }
}

// ─── Update profile fields ───────────────────────────────────
export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, 'users', uid), updates)
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
