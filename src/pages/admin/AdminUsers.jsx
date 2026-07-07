import { useState, useEffect } from 'react'
import { getAdminUsers, setUserBanned, setUserVerified, setUserAdmin } from '../../firebase/admin'
import Avatar from '../../components/Avatar'
import VerifiedBadge from '../../components/VerifiedBadge'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function AdminUsers() {
  const [users, setUsers]         = useState([])
  const [cursor, setCursor]       = useState(null)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch]       = useState('')
  const [actionUid, setActionUid] = useState(null) // uid being actioned

  useEffect(() => { fetchUsers() }, []) // eslint-disable-line

  async function fetchUsers(cur = null) {
    cur ? setLoadingMore(true) : setLoading(true)
    try {
      const { users: newUsers, nextCursor, hasMore: more } = await getAdminUsers(cur)
      setUsers(prev => cur ? [...prev, ...newUsers] : newUsers)
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function handleBan(uid, currentlyBanned) {
    setActionUid(uid)
    try {
      await setUserBanned(uid, !currentlyBanned)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, banned: !currentlyBanned } : u))
      toast.success(currentlyBanned ? 'User unbanned.' : 'User banned.')
    } catch {
      toast.error('Action failed.')
    } finally {
      setActionUid(null)
    }
  }

  async function handleVerify(uid, currentlyVerified) {
    setActionUid(uid)
    try {
      await setUserVerified(uid, !currentlyVerified)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: !currentlyVerified } : u))
      toast.success(currentlyVerified ? 'Blue tick removed.' : '✅ Blue tick granted!')
    } catch {
      toast.error('Action failed.')
    } finally {
      setActionUid(null)
    }
  }

  async function handleAdminToggle(uid, currentlyAdmin) {
    if (!window.confirm(currentlyAdmin ? 'Revoke admin access?' : 'Grant admin access to this user?')) return
    setActionUid(uid)
    try {
      await setUserAdmin(uid, !currentlyAdmin)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isAdmin: !currentlyAdmin } : u))
      toast.success(currentlyAdmin ? 'Admin access revoked.' : '⚡ Admin access granted!')
    } catch {
      toast.error('Action failed.')
    } finally {
      setActionUid(null)
    }
  }

  const filtered = users.filter(u =>
    !search ||
    u.username?.includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.branch?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Users</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {users.length} loaded · search to filter
          </p>
        </div>
        <input
          id="admin-user-search"
          className="form-input"
          style={{ width: 240 }}
          placeholder="Search name / username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                {['User', 'Branch / Year', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {Array.from({ length: 5 }, (_, j) => (
                      <td key={j} style={{ padding: 'var(--space-4)' }}>
                        <div className="skeleton" style={{ height: 14, width: j === 0 ? 140 : 80, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
              ) : filtered.map(user => {
                const joinedAt = user.createdAt?.toDate?.()
                return (
                  <tr
                    key={user.uid}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--dur-fast)', opacity: user.banned ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* User */}
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <Avatar src={user.photoURL} name={user.name} size="sm" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {user.name}
                            {user.isVerified && <VerifiedBadge size={13} />}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>@{user.username}</div>
                        </div>
                        {user.isAdmin && <span className="badge badge-brand" style={{ fontSize: '0.6rem' }}>⚡Admin</span>}
                      </div>
                    </td>
                    {/* Branch / Year */}
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {user.branch && <span className="badge badge-brand">{user.branch}</span>}
                        {user.year   && <span className="badge badge-green">{user.year}</span>}
                      </div>
                    </td>
                    {/* Joined */}
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                      {joinedAt ? formatDistanceToNow(joinedAt, { addSuffix: true }) : '—'}
                    </td>
                    {/* Status */}
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {user.banned
                        ? <span className="badge badge-red">Banned</span>
                        : <span className="badge badge-green">Active</span>
                      }
                    </td>
                    {/* Actions */}
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>

                        {/* 💠 Blue tick */}
                        <button
                          id={`admin-btn-verify-${user.uid}`}
                          className={`btn btn-sm ${user.isVerified ? 'btn-outline' : 'btn-outline'}`}
                          onClick={() => handleVerify(user.uid, !!user.isVerified)}
                          disabled={actionUid === user.uid}
                          title={user.isVerified ? 'Remove blue tick' : 'Grant blue tick'}
                          style={{ color: user.isVerified ? '#1D9BF0' : 'var(--text-muted)' }}
                        >
                          {actionUid === user.uid
                            ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            : user.isVerified ? '✔️ Verified' : '🞤 Verify'
                          }
                        </button>

                        {/* Ban / Unban */}
                        {!user.isAdmin && (
                          <button
                            id={`admin-btn-ban-${user.uid}`}
                            className={`btn btn-sm ${user.banned ? 'btn-outline' : 'btn-danger'}`}
                            onClick={() => handleBan(user.uid, user.banned)}
                            disabled={actionUid === user.uid}
                          >
                            {user.banned ? 'Unban' : 'Ban'}
                          </button>
                        )}

                        {/* Grant / Revoke admin */}
                        <button
                          id={`admin-btn-admin-${user.uid}`}
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleAdminToggle(user.uid, !!user.isAdmin)}
                          disabled={actionUid === user.uid}
                          title={user.isAdmin ? 'Revoke admin' : 'Make admin'}
                          style={{ color: user.isAdmin ? 'var(--brand-red)' : 'var(--text-muted)', fontSize: '0.7rem' }}
                        >
                          {user.isAdmin ? '⚡ Revoke Admin' : '⚡ Make Admin'}
                        </button>

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => fetchUsers(cursor)} disabled={loadingMore}>
              {loadingMore ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Loading…</> : 'Load more users'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
