import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { CallProvider, useCall } from '../contexts/CallContext'
import Icon from './Icon'
import Avatar from './Avatar'
import SuggestionsSidebar from './SuggestionsSidebar'
import VerifiedBadge from './VerifiedBadge'
import InstallBanner from './InstallBanner'
import NotificationBell from './NotificationBell'
import IncomingCallModal from './IncomingCallModal'
import ActiveCallUI from './ActiveCallUI'
import QuickCallModal from './QuickCallModal'
import toast from 'react-hot-toast'

function AppShellInner({ children }) {
  const { userProfile, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [quickCallOpen, setQuickCallOpen] = useState(false)

  const showSuggestions = location.pathname === '/'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  const navItems = [
    { to: '/',               icon: 'home',    label: 'Home'          },
    { to: '/explore',        icon: 'search',  label: 'Explore'       },
    { to: '/campus',         icon: 'book',    label: 'Campus'        },
    { to: `/u/${userProfile?.username}`, icon: 'user', label: 'Profile' },
  ]

  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>

      {/* ── Left Sidebar (desktop) ──────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/logo-header.png"
            alt="Palzy"
            style={{ height: 32, width: 'auto', objectFit: 'contain' }}
          />
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
            <span className="nav-item-icon"><Icon name={icon} size={20} /></span>
            {label}
          </NavLink>
        ))}

        {/* Quick Call Button desktop */}
        <button
          className="nav-item"
          onClick={() => setQuickCallOpen(true)}
          style={{ cursor: 'pointer', border: 'none', background: 'none', textAlign: 'left', width: '100%' }}
        >
          <span className="nav-item-icon" style={{ color: '#30d158' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </span>
          Quick Call
        </button>

        {/* Post Vibe CTA */}
        <button
          id="btn-compose-sidebar"
          className="btn btn-primary"
          style={{
            marginTop: 'var(--space-4)',
            width: '100%',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            padding: '0.8rem 1.5rem',
          }}
          onClick={() => navigate('/')}
        >
          <Icon name="plus" size={18} /> Post Vibe
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
              <img
                src="/logo-header.png"
                alt="Palzy"
                style={{ height: 28, width: 'auto', objectFit: 'contain' }}
              />
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {/* Quick Call mobile button */}
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setQuickCallOpen(true)}
                title="Quick Call"
                aria-label="Quick Call"
                style={{ color: '#30d158' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </button>

              {/* Notification bell */}
              <NotificationBell />

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
          </nav>

        </main>

        {/* ── Right sidebar: suggestions (desktop only) ──────── */}
        {showSuggestions && (
          <div className="suggestions-col">
            <SuggestionsSidebar />
          </div>
        )}
      </div>
      <InstallBanner />

      {/* ── Voice call overlays (globally available) ── */}
      <IncomingCallModal />
      <ActiveCallUI />
      <QuickCallModal isOpen={quickCallOpen} onClose={() => setQuickCallOpen(false)} />

      {/* Hidden audio element for remote voice stream */}
      <audio ref={useCallAudio()} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  )
}

function useCallAudio() {
  try {
    const { remoteAudioRef } = useCall()
    return remoteAudioRef
  } catch {
    return null
  }
}

export default function AppShell({ children }) {
  return (
    <CallProvider>
      <AppShellInner>{children}</AppShellInner>
    </CallProvider>
  )
}
