import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './Icon'
import Avatar from './Avatar'
import toast from 'react-hot-toast'

export default function AppShell({ children }) {
  const { userProfile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  const navItems = [
    { to: '/',         icon: 'home',   label: 'Home' },
    { to: '/explore',  icon: 'search', label: 'Explore' },
    { to: `/u/${userProfile?.username}`, icon: 'user', label: 'Profile' },
  ]

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>🎓</span>
          <span className="sidebar-logo-text">Palzy</span>
        </div>

        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-item-icon"><Icon name={icon} size={22} /></span>
            {label}
          </NavLink>
        ))}

        {/* Compose button */}
        <button id="btn-compose-sidebar" className="btn btn-primary" style={{ marginTop: 'var(--space-4)', width: '100%' }} onClick={() => navigate('/')}>
          <Icon name="plus" size={18} /> Post
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User info + logout */}
        {userProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)' }}>
            <Avatar src={userProfile.photoURL} name={userProfile.name} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate font-semibold text-sm">{userProfile.name}</div>
              <div className="truncate text-xs text-muted">@{userProfile.username}</div>
            </div>
            <button id="btn-logout" className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout" aria-label="Logout">
              <Icon name="logout" size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {/* Mobile topbar */}
        <header className="topbar">
          <span style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎓 Palzy
          </span>
          {userProfile && (
            <NavLink to={`/u/${userProfile.username}`}>
              <Avatar src={userProfile.photoURL} name={userProfile.name} size="sm" />
            </NavLink>
          )}
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
          <button id="btn-compose-mobile" className="bottom-nav-item" onClick={() => navigate('/')} style={{ color: 'var(--brand-primary)' }}>
            <Icon name="plus" size={24} />
            <span>Post</span>
          </button>
        </nav>
      </main>
    </div>
  )
}
