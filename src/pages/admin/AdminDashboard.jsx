import { useEffect, useState } from 'react'
import { getAdminStats } from '../../firebase/admin'
import { Link } from 'react-router-dom'

function StatCard({ label, value, icon, color, to }) {
  const card = (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid var(--border-subtle)`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      transition: 'all var(--dur-fast)',
      cursor: to ? 'pointer' : 'default',
      textDecoration: 'none',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)' }}}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = '' }}
    >
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.12, filter: 'blur(20px)' }} />

      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value ?? <div className="skeleton" style={{ width: 60, height: 36, borderRadius: 4 }} />}
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
    </div>
  )

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Overview of Palzy — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-10)' }}>
        <StatCard label="Total Users"   icon="👥" value={loading ? null : stats?.totalUsers}   color="var(--brand-primary)" to="/admin/users" />
        <StatCard label="Total Posts"   icon="📝" value={loading ? null : stats?.totalPosts}   color="var(--brand-accent)"  to="/admin/posts" />
        <StatCard label="Open Reports"  icon="🚩" value={loading ? null : stats?.totalReports} color="var(--brand-red)"     to="/admin/reports" />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/admin/users"   className="btn btn-outline"><span>👥</span> Manage Users</Link>
          <Link to="/admin/posts"   className="btn btn-outline"><span>📝</span> Manage Posts</Link>
          <Link to="/admin/reports" className="btn btn-danger" ><span>🚩</span> Review Reports</Link>
          <Link to="/"             className="btn btn-ghost"  ><span>🎓</span> Go to Feed</Link>
        </div>
      </div>

      {/* How to make someone admin */}
      <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid var(--border-brand)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-brand)' }}>💡 How to grant admin access</div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Open <strong style={{ color: 'var(--text-primary)' }}>Firebase Console → Firestore → users → {'{uid}'}</strong> and add the field:<br />
          <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--brand-primary-dim)', fontFamily: 'monospace' }}>isAdmin: true</code> (boolean)
        </div>
      </div>
    </div>
  )
}
