import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Protects routes requiring authentication.
 * - Not logged in → /login
 * - Logged in but no username set → /setup-username
 * - Logged in but no college PIN → /verify-pin
 * - OK → renders child route
 */
export default function ProtectedRoute({ requireProfile = true }) {
  const { currentUser, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />

  if (requireProfile && !userProfile) return <Navigate to="/setup-username" replace />

  // Existing user has a profile but hasn't entered their college PIN yet
  if (requireProfile && userProfile && !userProfile.collegePin && location.pathname !== '/verify-pin') {
    return <Navigate to="/verify-pin" replace />
  }

  return <Outlet />
}
