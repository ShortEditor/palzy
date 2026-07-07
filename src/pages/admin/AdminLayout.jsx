import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import Avatar from '../../components/Avatar'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin',         label: 'Dashboard', icon: 'home',    end: true },
  { to: '/admin/users',   label: 'Users',     icon: 'user' },
  { to: '/admin/posts',   label: 'Posts',     icon: 'image' },
  { to: '/admin/reports', label: 'Reports',   icon: 'bell' },
]

export default function AdminLayout() {
  const { userProfile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)' }}>

      {/* ── Admin Sidebar ──────────────────────────────────── */}
      <aside style={{
        width: 240,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-6) var(--space-4)',
        gap: 'var(--space-1)',
        position: 'sticky',
        top: 0,
        height: '100dvh',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <span style={{ fontSize: '1.3rem' }}>🎓</span>
            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Palzy
            </span>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,71,87,0.15)', color: 'var(--brand-red)',
            borderRadius: 'var(--radius-full)', padding: '2px 10px',
            fontSize: 'var(--font-size-xs)', fontWeight: 700, letterSpacing: '0.05em',
          }}>
            ⚡ Admin Panel
          </div>
        </div>

        {/* Nav items */}
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-item-icon"><Icon name={icon} size={20} /></span>
            {label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        {/* Back to app */}
        <NavLink to="/" className="nav-item" style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
          <span className="nav-item-icon"><Icon name="arrow_left" size={18} /></span>
          Back to Palzy
        </NavLink>

        {/* User strip */}
        {userProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', marginTop: 'var(--space-2)' }}>
            <Avatar src={userProfile.photoURL} name={userProfile.name} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate font-semibold text-xs">{userProfile.name}</div>
              <div className="truncate text-xs text-muted">Admin</div>
            </div>
            <button id="admin-btn-logout" className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
              <Icon name="logout" size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
