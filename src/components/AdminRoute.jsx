import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Blocks access to admin routes.
 * - Not logged in → /login
 * - Logged in but not admin → / (home, silently)
 * - Is admin → renders child routes
 */
export default function AdminRoute() {
  const { currentUser, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin)     return <Navigate to="/" replace />

  return <Outlet />
}
