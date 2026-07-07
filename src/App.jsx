import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import SetupUsernamePage from './pages/SetupUsernamePage'
import FeedPage from './pages/FeedPage'
import PostDetailPage from './pages/PostDetailPage'
import ProfilePage from './pages/ProfilePage'
import ExplorePage from './pages/ExplorePage'

function AppShellWrapper() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Auth required but no profile needed */}
      <Route element={<ProtectedRoute requireProfile={false} />}>
        <Route path="/setup-username" element={<SetupUsernamePage />} />
      </Route>

      {/* Auth + profile required */}
      <Route element={<ProtectedRoute requireProfile={true} />}>
        <Route element={<AppShellWrapper />}>
          <Route path="/"             element={<FeedPage />} />
          <Route path="/explore"      element={<ExplorePage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/u/:username"  element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
