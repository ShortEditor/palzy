import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Icon from './Icon'
import Avatar from './Avatar'
import SuggestionsSidebar from './SuggestionsSidebar'
import VerifiedBadge from './VerifiedBadge'
import toast from 'react-hot-toast'

export default function AppShell({ children }) {
  const { userProfile, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

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

  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>

      {/* ── Left Sidebar (desktop) ──────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Icon name="graduationCap" size={20} style={{ color: '#fff' }} />
          </div>
          <span className="sidebar-logo-text">Palzy</span>
        </div>

        {/* Nav items */}
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-item-icon"><Icon name={icon} size={22} /></span>
            {label}
          </NavLink>
        ))}

        {/* Compose button */}
        <button
          id="btn-compose-sidebar"
          className="btn btn-primary"
          style={{ marginTop: 'var(--space-4)', width: '100%', borderRadius: 'var(--radius-xl)' }}
          onClick={() => navigate('/')}
        >
          <Icon name="plus" size={18} /> Post
        </button>

        <div style={{ flex: 1 }} />

        {/* Admin link */}
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

        {/* Theme toggle */}
        <button
          id="btn-theme-toggle"
          className="nav-item"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ marginBottom: 'var(--space-2)' }}
        >
          <span className="nav-item-icon">
            <Icon name={isDark ? 'sun' : 'moon'} size={20} />
          </span>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User strip + logout */}
        {userProfile && (
          <div className="sidebar-user-strip">
            <Avatar src={userProfile.photoURL} name={userProfile.name} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="truncate font-semibold text-sm">
                <span className="truncate">{userProfile.name}</span>
                {userProfile.isVerified && <VerifiedBadge size={13} />}
              </div>
              <div className="truncate text-xs text-muted">@{userProfile.username}</div>
            </div>
            <button
              id="btn-logout"
              className="btn btn-ghost btn-icon"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
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
            <span className="topbar-logo">
              <div className="topbar-logo-icon">
                <Icon name="graduationCap" size={16} style={{ color: '#fff' }} />
              </div>
              Palzy
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {/* Theme toggle mobile */}
              <button
                id="btn-theme-toggle-mobile"
                className="btn btn-ghost btn-icon"
                onClick={toggleTheme}
                aria-label={isDark ? 'Light mode' : 'Dark mode'}
              >
                <Icon name={isDark ? 'sun' : 'moon'} size={20} />
              </button>

              {userProfile && (
                <NavLink to={`/u/${userProfile.username}`}>
                  <Avatar src={userProfile.photoURL} name={userProfile.name} size="sm" />
                </NavLink>
              )}
              <button
                id="btn-logout-mobile"
                className="btn btn-ghost btn-icon"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
              >
                <Icon name="logout" size={18} />
              </button>
            </div>
          </header>

          {children}

          {/* Mobile bottom nav */}
          <nav className="bottom-nav" aria-label="Mobile navigation">
            {navItems.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon name={icon} size={24} />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              id="btn-compose-mobile"
              className="bottom-nav-item bottom-nav-compose"
              onClick={() => navigate('/')}
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
