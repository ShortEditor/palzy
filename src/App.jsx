import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AppShell from './components/AppShell'

// ── Eagerly loaded (shown immediately / auth flow) ────────────
import LoginPage from './pages/LoginPage'
import SetupUsernamePage from './pages/SetupUsernamePage'

// ── Lazy loaded (only fetched when navigated to) ──────────────
const FeedPage       = lazy(() => import('./pages/FeedPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const ExplorePage    = lazy(() => import('./pages/ExplorePage'))
const CampusPage     = lazy(() => import('./pages/CampusPage'))
const AdminLayout    = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'))
const AdminPosts     = lazy(() => import('./pages/admin/AdminPosts'))
const AdminReports   = lazy(() => import('./pages/admin/AdminReports'))

function PageLoader() {
  return (
    <div style={{ minHeight: '60dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  )
}

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Auth required, no profile needed */}
        <Route element={<ProtectedRoute requireProfile={false} />}>
          <Route path="/setup-username" element={<SetupUsernamePage />} />
        </Route>

        {/* ── Admin routes ─────────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"          element={<AdminDashboard />} />
            <Route path="/admin/users"    element={<AdminUsers />} />
            <Route path="/admin/posts"    element={<AdminPosts />} />
            <Route path="/admin/reports"  element={<AdminReports />} />
          </Route>
        </Route>

        {/* Auth + profile required — main app */}
        <Route element={<ProtectedRoute requireProfile={true} />}>
          <Route element={<AppShellWrapper />}>
            <Route path="/"             element={<FeedPage />} />
            <Route path="/explore"      element={<ExplorePage />} />
            <Route path="/campus"       element={<CampusPage />} />
            <Route path="/post/:postId" element={<PostDetailPage />} />
            <Route path="/u/:username"  element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
