import { useState, useEffect, useRef, useMemo } from 'react'
import { getAllUsersForSearch, filterUsersLocally } from '../firebase/users'
import { getRecommendations, getFollowingIds, getFollowerIds } from '../firebase/follows'
import { getUserProfile } from '../firebase/users'
import { useAuth } from '../contexts/AuthContext'
import { useCall } from '../contexts/CallContext'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import Icon from './Icon'

const PhoneIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
)

const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

export default function QuickCallModal({ isOpen, onClose }) {
  const { currentUser } = useAuth()
  const { callState, startCall } = useCall()
  const [query, setQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [connections, setConnections] = useState([])   // following + followers (deduplicated, ordered)
  const [suggestions, setSuggestions] = useState([])   // friend-of-friend recs
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Pre-fetch users + connections + recommendations on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setLoading(true)
      const uid = currentUser?.uid
      Promise.all([
        getAllUsersForSearch(),
        uid ? getFollowingIds(uid) : Promise.resolve([]),
        uid ? getFollowerIds(uid)  : Promise.resolve([]),
        uid ? getRecommendations(uid, 8) : Promise.resolve([]),
      ])
        .then(async ([users, followingIds, followerIds, recs]) => {
          setAllUsers(users)

          // Build an ordered, deduplicated connections list:
          // 1. Mutual follows first (you follow them AND they follow you)
          // 2. People you follow
          // 3. Your followers (who you don't follow back yet)
          const followerSet  = new Set(followerIds)
          const followingSet = new Set(followingIds)
          const seen         = new Set([uid])

          // Fetch profiles for all connections efficiently using the already-fetched allUsers list
          const userMap = new Map(users.map(u => [u.uid, u]))

          const ordered = []

          // Mutuals first
          for (const id of followingIds) {
            if (!seen.has(id) && followerSet.has(id)) {
              const profile = userMap.get(id)
              if (profile) { ordered.push({ ...profile, _rel: 'mutual' }); seen.add(id) }
            }
          }
          // Followed-but-not-following-back
          for (const id of followingIds) {
            if (!seen.has(id)) {
              const profile = userMap.get(id)
              if (profile) { ordered.push({ ...profile, _rel: 'following' }); seen.add(id) }
            }
          }
          // Followers you don't follow back
          for (const id of followerIds) {
            if (!seen.has(id)) {
              const profile = userMap.get(id)
              if (profile) { ordered.push({ ...profile, _rel: 'follower' }); seen.add(id) }
            }
          }

          setConnections(ordered)

          // Suggestions = recs that are not already in connections
          setSuggestions(recs.filter(u => u.uid !== uid && !seen.has(u.uid)))
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setQuery('')
    }
  }, [isOpen, currentUser?.uid])

  // Instant in-memory search results (0ms delay)
  const results = useMemo(() => {
    if (!query.trim()) return null   // null = show the sectioned list
    return filterUsersLocally(allUsers, query, currentUser?.uid, 20)
  }, [allUsers, query, currentUser?.uid])

  if (!isOpen) return null

  const busy = callState !== 'idle'

  function handleStartCall(user) {
    onClose()
    startCall(user.uid, user)
  }

  const relLabel = { mutual: 'Mutual', following: 'Following', follower: 'Follower' }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1800,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 16px 16px', animation: 'pwaFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 24, width: '100%', maxWidth: 440,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: '80vh', animation: 'pwaSlideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #30d158, #1a9944)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PhoneIcon size={16} />
            </span>
            Quick Voice Call
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-input)', border: 'none', borderRadius: '50%',
              width: 30, height: 30, color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-input)', borderRadius: 14,
            padding: '10px 14px', border: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><SearchIcon size={18} /></span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search name or @username to call…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                width: '100%', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Results list */}
        <div style={{ overflowY: 'auto', padding: '8px 12px', flex: 1, minHeight: 180 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading…
            </div>

          ) : results !== null ? (
            // ── Search results ──
            results.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No users found matching &quot;{query}&quot;
              </div>
            ) : (
              results.map(user => <UserRow key={user.uid} user={user} busy={busy} onCall={handleStartCall} />)
            )

          ) : connections.length === 0 && suggestions.length === 0 ? (
            // ── Empty state ──
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Type a name or @username above to make an instant voice call <Icon name="phone" size={14} />
            </div>

          ) : (
            // ── Sectioned default list: connections first, then suggestions ──
            <>
              {connections.length > 0 && (
                <>
                  <SectionLabel label="Following & Followers" />
                  {connections.map(user => (
                    <UserRow
                      key={user.uid}
                      user={user}
                      busy={busy}
                      onCall={handleStartCall}
                      badge={relLabel[user._rel]}
                    />
                  ))}
                </>
              )}

              {suggestions.length > 0 && (
                <>
                  <SectionLabel label="Suggested Friends" topBorder={connections.length > 0} />
                  {suggestions.map(user => (
                    <UserRow key={user.uid} user={user} busy={busy} onCall={handleStartCall} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ label, topBorder = false }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
      padding: topBorder ? '12px 12px 8px' : '6px 12px 8px',
      textTransform: 'uppercase', letterSpacing: 0.5,
      borderTop: topBorder ? '1px solid var(--border-subtle)' : 'none',
      marginTop: topBorder ? 6 : 0,
    }}>
      {label}
    </div>
  )
}

function UserRow({ user, busy, onCall, badge }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: 14,
        transition: 'background 0.15s',
      }}
      className="hover-bg-input"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar src={user.photoURL} name={user.name} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="truncate">{user.name}</span>
            {user.isVerified && <VerifiedBadge size={13} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }} className="truncate">
            @{user.username}
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 99, background: 'var(--bg-elevated)',
                color: badge === 'Mutual' ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                lineHeight: 1.5,
              }}>
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onCall(user)}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 18,
          background: busy ? 'var(--bg-input)' : 'linear-gradient(135deg, #30d158, #1a9944)',
          color: busy ? 'var(--text-muted)' : '#fff',
          border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
          fontWeight: 700, fontSize: 13,
          boxShadow: busy ? 'none' : '0 4px 12px rgba(48,209,88,0.35)',
          transition: 'transform 0.15s',
          flexShrink: 0,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        Call
      </button>
    </div>
  )
}

