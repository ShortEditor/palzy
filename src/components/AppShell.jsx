import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'
import Avatar from './Avatar'
import SuggestionsSidebar from './SuggestionsSidebar'
import VerifiedBadge from './VerifiedBadge'
import toast from 'react-hot-toast'

export default function AppShell({ children }) {
  const { userProfile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Only show suggestions sidebar on the home feed
  const showSuggestions = location.pathname === '/'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  const navItems = [
    { to: '/',        icon: 'home',   label: 'Home'    },
    { to: '/explore', icon: 'search', label: 'Explore' },
    { to: `/u/${userProfile?.username}`, icon: 'user', label: 'Profile' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>

      {/* ── Left Sidebar (desktop) ──────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Icon name="graduationCap" size={24} style={{ color: 'var(--brand-primary)' }} />
          <span className="sidebar-logo-text">Palzy</span>
        </div>

        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-item-icon"><Icon name={icon} size={22} /></span>
            {label}
          </NavLink>
        ))}

        {/* Compose button */}
        <button
          id="btn-compose-sidebar"
          className="btn btn-primary"
          style={{ marginTop: 'var(--space-4)', width: '100%' }}
          onClick={() => navigate('/')}
        >
          <Icon name="plus" size={18} /> Post
        </button>

        <div style={{ flex: 1 }} />

        {/* Admin link — only for admins */}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ color: 'var(--brand-red)', marginBottom: 'var(--space-1)' }}
          >
            <span className="nav-item-icon"><Icon name="zap" size={20} /></span>
            Admin Panel
          </NavLink>
        )}

        {/* User strip + logout */}
        {userProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)' }}>
            <Avatar src={userProfile.photoURL} name={userProfile.name} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="truncate font-semibold text-sm">
                <span className="truncate">{userProfile.name}</span>
                {userProfile.isVerified && <VerifiedBadge size={13} />}
              </div>
              <div className="truncate text-xs text-muted">@{userProfile.username}</div>
            </div>
            <button id="btn-logout" className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout" aria-label="Logout">
              <Icon name="logout" size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main + Right ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <main className="main-content" style={{ flex: 1, minWidth: 0 }}>

          {/* Mobile topbar */}
          <header className="topbar">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <Icon name="graduationCap" size={20} style={{ color: 'var(--brand-primary)' }} />
              Palzy
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {userProfile && (
                <NavLink to={`/u/${userProfile.username}`}>
                  <Avatar src={userProfile.photoURL} name={userProfile.name} size="sm" />
                </NavLink>
              )}
              {/* Mobile logout */}
              <button
                id="btn-logout-mobile"
                className="btn btn-ghost btn-icon"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                style={{ padding: 'var(--space-2)' }}
              >
                <Icon name="logout" size={18} />
              </button>
            </div>
          </header>

          {children}

          {/* Mobile bottom nav */}
          <nav className="bottom-nav" aria-label="Mobile navigation">
            {navItems.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={icon} size={24} />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              id="btn-compose-mobile"
              className="bottom-nav-item"
              onClick={() => navigate('/')}
              style={{ color: 'var(--brand-primary)' }}
            >
              <Icon name="plus" size={24} />
              <span>Post</span>
            </button>
          </nav>
        </main>

        {/* ── Right sidebar: suggestions (desktop only) ──────── */}
        {showSuggestions && (
          <div className="suggestions-col">
            <SuggestionsSidebar />
          </div>
        )}
      </div>
    </div>
  )
}
