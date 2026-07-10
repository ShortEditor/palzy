import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRecommendations } from '../firebase/follows'
import FollowButton from './FollowButton'
import VerifiedBadge from './VerifiedBadge'
import Avatar from './Avatar'
import Icon from './Icon'

export default function SuggestionsSidebar() {
  const { currentUser, userProfile } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!currentUser) return
    getRecommendations(currentUser.uid, 6)
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser])

  function handleFollowed(uid) {
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
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-clay)',
      }}>
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--font-size-base)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="users" size={15} /> People you may know
          </span>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={13} /> You're all caught up!</span>
          </div>
        ) : (
          suggestions.map(user => (
            <div
              key={user.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'background var(--dur-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <Link to={`/u/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                {/* Avatar with ring */}
                <div className="avatar-ring" style={{ flexShrink: 0 }}>
                  <Avatar src={user.photoURL} name={user.name} size="sm" />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                      {user.name}
                    </span>
                    {user.isVerified && <VerifiedBadge size={12} />}
                  </div>

                  {/* Mutuals line */}
                  {user.mutualCount > 0 ? (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                      {/* Tiny mutual avatar stacks */}
                      <div style={{ display: 'flex', marginRight: 2 }}>
                        {user.mutualSamples?.slice(0, 2).map(m => (
                          <div key={m.uid} style={{
                            width: 14, height: 14, borderRadius: '50%', overflow: 'hidden',
                            border: '1.5px solid var(--bg-card)',
                            marginLeft: -4, firstChild: { marginLeft: 0 },
                            background: 'var(--bg-input)', flexShrink: 0,
                          }}>
                            {m.photoURL
                              ? <img src={m.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--brand-primary-cont),var(--brand-accent))', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 6, color:'#fff', fontWeight:700 }}>{m.name?.[0]}</div>
                            }
                          </div>
                        ))}
                      </div>
                      {user.mutualCount} mutual{user.mutualCount !== 1 ? 's' : ''}
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{user.username}
                    </div>
                  )}
                </div>
              </Link>

              <FollowButton
                targetUid={user.uid}
                onToggle={(followed) => { if (followed) handleFollowed(user.uid) }}
              />
            </div>
          ))
        )}

        {suggestions.length > 0 && (
          <Link
            to="/explore"
            style={{ display: 'block', padding: 'var(--space-3) var(--space-5)', color: 'var(--text-brand)', fontSize: 'var(--font-size-sm)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-display)' }}
            onMouseEnter={e => e.target.style.color = 'var(--brand-accent)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-brand)'}
          >
            See all recommendations →
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
        <div style={{ marginTop: 'var(--space-2)' }}>© 2026 Palzy · Made for college</div>
      </div>
    </aside>
  )
}
