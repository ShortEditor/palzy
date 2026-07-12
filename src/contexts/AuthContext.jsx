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
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]     = useState(null)
  const [userProfile, setUserProfile]     = useState(null)
  // loading = true until BOTH firebase auth state AND firestore profile are resolved
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      if (user) {
        try {
          // Wait for the Firestore profile before marking loading = false
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)

          // 🎂 Anniversary ping (once per session)
          if (profile?.createdAt && !sessionStorage.getItem('palzy_anniv_shown')) {
            const created = profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt)
            const now = new Date()
            if (created.getMonth() === now.getMonth() && created.getDate() === now.getDate()) {
              const years = now.getFullYear() - created.getFullYear()
              sessionStorage.setItem('palzy_anniv_shown', '1')
              setTimeout(() => {
                toast(`🎂 ${years > 0 ? `${years} year${years > 1 ? 's' : ''} on Palzy today!` : 'Happy Palzy birthday!'} 🎉`, {
                  duration: 6000,
                  icon: '🎂',
                  style: { fontWeight: 600 },
                })
              }, 2000) // slight delay so the page settles first
            }
          }
        } catch (err) {
          console.error('Failed to load user profile:', err)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }

      // Only mark done AFTER profile fetch completes (or is skipped for logged-out)
      setLoading(false)
    })
    return unsub
  }, [])

  // ── Google sign-in ────────────────────────────────────────
  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
    // onAuthStateChanged will fire and load profile automatically
  }

  // ── Email sign-up ─────────────────────────────────────────
  async function signUpWithEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred.user
  }

  // ── Email sign-in ─────────────────────────────────────────
  async function signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged will fire and load profile automatically
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

  // ── Refresh local profile cache (call after editing profile) ──
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
