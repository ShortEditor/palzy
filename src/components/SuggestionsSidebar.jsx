import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSuggestions } from '../firebase/follows'
import FollowButton from './FollowButton'
import VerifiedBadge from './VerifiedBadge'
import Avatar from './Avatar'

export default function SuggestionsSidebar() {
  const { currentUser, userProfile } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!currentUser) return
    getSuggestions(currentUser.uid, userProfile?.branch, 6)
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser, userProfile?.branch])

  function handleFollowed(uid) {
    // Remove from suggestions after following
    setSuggestions(prev => prev.filter(u => u.uid !== uid))
  }

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      padding: 'var(--space-6) var(--space-4)',
      position: 'sticky',
      top: 0,
      height: '100dvh',
      overflowY: 'auto',
      borderLeft: '1px solid var(--border-subtle)',
    }}>
      {/* Who to follow */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
        }}>
          🎓 People you may know
        </div>

        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 10, width: '50%', borderRadius: 4 }} />
              </div>
            </div>
          ))
        ) : suggestions.length === 0 ? (
          <div style={{ padding: 'var(--space-5)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            You're following everyone! 🎉
          </div>
        ) : (
          suggestions.map(user => (
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
              <Link to={`/u/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <Avatar src={user.photoURL} name={user.name} size="sm" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                      {user.name}
                    </span>
                    {user.isVerified && <VerifiedBadge size={13} />}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{user.username} · {user.branch}
                  </div>
                </div>
              </Link>

              <FollowButton
                targetUid={user.uid}
                initialState={false}
                onToggle={(followed) => { if (followed) handleFollowed(user.uid) }}
              />
            </div>
          ))
        )}

        {suggestions.length > 0 && (
          <Link
            to="/explore"
            style={{ display: 'block', padding: 'var(--space-3) var(--space-5)', color: 'var(--text-brand)', fontSize: 'var(--font-size-sm)', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => e.target.style.color = 'var(--brand-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-brand)'}
          >
            Show more →
          </Link>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'var(--space-5)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', lineHeight: 1.8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {['Privacy', 'Terms', 'About', 'Help'].map(l => (
            <span key={l} style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-2)' }}>© 2026 Palzy · Made for college ✌️</div>
      </div>
    </aside>
  )
}
