import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getFollowerProfiles, getFollowingProfiles, getFollowingIds } from '../firebase/follows'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import FollowButton from './FollowButton'
import Icon from './Icon'

/**
 * Modal showing the followers or following list of a profile.
 *
 * Props:
 *   uid      – whose followers/following to load
 *   tab      – 'followers' | 'following'
 *   onClose  – callback to close modal
 */
export default function FollowListModal({ uid, tab: initialTab, onClose }) {
  const { currentUser } = useAuth()
  const [tab, setTab]             = useState(initialTab)
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [myFollowing, setMyFollowing] = useState(new Set()) // IDs I follow

  // Load current user's following set once
  useEffect(() => {
    if (!currentUser) return
    getFollowingIds(currentUser.uid)
      .then(ids => setMyFollowing(new Set(ids)))
      .catch(console.error)
  }, [currentUser])

  useEffect(() => {
    setLoading(true)
    setUsers([])
    const fn = tab === 'followers' ? getFollowerProfiles : getFollowingProfiles
    fn(uid)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [uid, tab])

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={tab === 'followers' ? 'Followers' : 'Following'}
    >
      <div className="modal-box" style={{ maxWidth: 420 }}>

        {/* Header with tabs */}
        <div className="modal-header" style={{ padding: 0, border: 'none' }}>
          <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid var(--border-subtle)' }}>
            {['followers', 'following'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: 'var(--space-4)',
                  fontWeight: tab === t ? 700 : 500,
                  fontSize: 'var(--font-size-sm)',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all var(--dur-fast)',
                }}
              >
                {t}
              </button>
            ))}
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon"
              style={{ margin: 'var(--space-2)' }}
              aria-label="Close"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxHeight: '60dvh', overflowY: 'auto' }}>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 4, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 4 }} />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>
                <Icon name={tab === 'followers' ? 'users' : 'telescope'} size={40} />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </div>
            </div>
          ) : (
            users.map(user => (
              <div
                key={user.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background var(--dur-fast)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <Link
                  to={`/u/${user.username}`}
                  onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, textDecoration: 'none' }}
                >
                  <Avatar src={user.photoURL} name={user.name} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name}
                      </span>
                      {user.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      @{user.username}
                      {user.branch && user.showBranch !== false && <> · {user.branch}</>}
                      {user.year && user.showYear !== false && <> · {user.year}</>}
                    </div>
                    {user.bio && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {user.bio}
                      </div>
                    )}
                  </div>
                </Link>

                <FollowButton
                  targetUid={user.uid}
                  initialState={myFollowing.has(user.uid)}
                  onToggle={followed => {
                    setMyFollowing(prev => {
                      const next = new Set(prev)
                      followed ? next.add(user.uid) : next.delete(user.uid)
                      return next
                    })
                  }}
                  size="sm"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
