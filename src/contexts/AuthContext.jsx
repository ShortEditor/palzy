import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { getUserProfile } from '../firebase/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null)
  const [userProfile, setUserProfile]   = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // ── Google sign-in ────────────────────────────────────────
  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  // ── Email sign-up ─────────────────────────────────────────
  async function signUpWithEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Set display name on the Firebase Auth user object
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred.user
  }

  // ── Email sign-in ─────────────────────────────────────────
  async function signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  // ── Forgot password ───────────────────────────────────────
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email)
  }

  // ── Logout ────────────────────────────────────────────────
  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  // ── Refresh local profile cache ───────────────────────────
  async function refreshProfile() {
    if (!currentUser) return
    const profile = await getUserProfile(currentUser.uid)
    setUserProfile(profile)
  }

  const isAdmin = userProfile?.isAdmin === true

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      isAdmin,
      loading,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      resetPassword,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
