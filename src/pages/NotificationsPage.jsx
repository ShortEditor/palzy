import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useCall } from '../contexts/CallContext'
import { listenNotifications, markAllRead, clearAllNotifications, deleteNotification } from '../firebase/notifications'
import Avatar from '../components/Avatar'
import FollowButton from '../components/FollowButton'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  like:     { icon: '❤️', text: 'liked your post' },
  reaction: { icon: '🔥', text: 'reacted to your post' },
  comment:  { icon: '💬', text: 'commented on your post' },
  reply:    { icon: '↩️', text: 'replied to your comment' },
  follow:   { icon: '👤', text: 'started following you' },
  mention:  { icon: '@',  text: 'mentioned you' },
  call:     { icon: '📞', text: 'missed voice call from' },
}

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const { startCall, callState } = useCall()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    const unsub = listenNotifications(currentUser.uid, (items) => {
      setNotifications(items)
      setLoading(false)
    })
    // Auto-mark unread as read
    markAllRead(currentUser.uid).catch(() => {})
    return unsub
  }, [currentUser])

  function formatTime(ts) {
    if (!ts) return ''
    try {
      let date
      if (ts.toDate) date = ts.toDate()
      else if (ts.seconds) date = new Date(ts.seconds * 1000)
      else if (typeof ts === 'number') date = new Date(ts)
      else if (ts instanceof Date) date = ts
      else date = new Date(ts)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return ''
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Clear all notifications?')) return
    setClearing(true)
    try {
      await clearAllNotifications(currentUser.uid)
      setNotifications([])
      toast.success('All notifications cleared')
    } catch {
      toast.error('Could not clear notifications')
    } finally {
      setClearing(false)
    }
  }

  async function handleDeleteSingle(id, e) {
    e.stopPropagation()
    try {
      await deleteNotification(id, currentUser.uid)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  function handleRowClick(n) {
    if (n.postId) {
      navigate(`/post/${n.postId}`)
    } else if (n.fromUsername) {
      navigate(`/u/${n.fromUsername}`)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) 0 var(--space-3)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Notifications
          </h1>
        </div>

        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => markAllRead(currentUser.uid).then(() => toast.success('Marked as read'))}
              style={{ fontSize: 12 }}
            >
              Mark read
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClearAll}
              disabled={clearing}
              style={{ fontSize: 12, color: 'var(--brand-red)' }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
          color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 'var(--space-3)',
          }}>
            🔔
          </div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>
            No notifications yet
          </h3>
          <p style={{ margin: 0 }}>When people like your posts, comment, follow you, or call, you'll see it here.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {notifications.map(n => {
          const config = TYPE_CONFIG[n.type] || { icon: '📣', text: 'interacted with you' }
          const displayIcon = n.type === 'reaction' && n.emoji ? n.emoji : config.icon
          const isUnread = !n.read

          return (
            <div
              key={n.id}
              onClick={() => handleRowClick(n)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: isUnread ? 'rgba(160,120,255,0.08)' : 'var(--bg-card)',
                border: `1px solid ${isUnread ? 'rgba(160,120,255,0.25)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="hover-bg-card"
            >
              {/* Avatar with icon badge */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Link to={`/u/${n.fromUsername}`} onClick={e => e.stopPropagation()}>
                  <Avatar src={n.fromPhotoURL} name={n.fromName || 'User'} size="md" />
                </Link>
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  fontSize: 13, lineHeight: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%', padding: '2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {displayIcon}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.45 }}>
                  <Link
                    to={`/u/${n.fromUsername}`}
                    onClick={e => e.stopPropagation()}
                    style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {n.fromName || n.fromUsername || 'Someone'}
                  </Link>
                  {' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{config.text}</span>
                </p>

                {/* Post content preview */}
                {n.postContent && (
                  <div style={{
                    marginTop: 4,
                    fontSize: 12, color: 'var(--text-muted)',
                    background: 'var(--bg-input)',
                    padding: '4px 8px', borderRadius: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', maxWidth: '100%',
                  }}>
                    "{n.postContent}"
                  </div>
                )}

                {/* Comment text preview */}
                {n.commentText && (
                  <div style={{
                    marginTop: 4,
                    fontSize: 12, color: 'var(--text-primary)',
                    background: 'var(--bg-input)',
                    padding: '4px 8px', borderRadius: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', maxWidth: '100%', fontStyle: 'italic',
                  }}>
                    "{n.commentText}"
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatTime(n.createdAt)}
                  </span>
                  {isUnread && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--brand-primary)', display: 'inline-block',
                    }} />
                  )}
                </div>
              </div>

              {/* Action button on right side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {n.type === 'follow' && n.fromUid && (
                  <FollowButton targetUid={n.fromUid} size="sm" />
                )}

                {n.type === 'call' && n.fromUid && (
                  <button
                    onClick={() => startCall(n.fromUid, { name: n.fromName, username: n.fromUsername, photoURL: n.fromPhotoURL })}
                    disabled={callState !== 'idle'}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 16 }}
                  >
                    📞 Call
                  </button>
                )}

                {/* Delete button */}
                <button
                  onClick={e => handleDeleteSingle(n.id, e)}
                  title="Dismiss notification"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: 16, padding: '2px 4px',
                    opacity: 0.6,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
