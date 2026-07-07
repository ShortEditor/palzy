import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Protects routes requiring authentication.
 * - Not logged in → /login
 * - Logged in but no username set → /setup-username
 * - OK → renders child route
 */
export default function ProtectedRoute({ requireProfile = true }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />

  if (requireProfile && !userProfile) return <Navigate to="/setup-username" replace />

  return <Outlet />
}
