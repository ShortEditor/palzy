import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { listenNotifications, markAllRead } from '../firebase/notifications'
import Avatar from '../components/Avatar'

const TYPE_LABEL = {
  like:    { icon: '❤️', text: 'liked your post' },
  comment: { icon: '💬', text: 'commented on your post' },
  reply:   { icon: '↩️', text: 'replied to your comment' },
  follow:  { icon: '👤', text: 'started following you' },
  mention: { icon: '@',  text: 'mentioned you' },
}

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    const unsub = listenNotifications(currentUser.uid, (items) => {
      setNotifications(items)
      setLoading(false)
    })
    // Mark all read when page opens
    markAllRead(currentUser.uid).catch(() => {})
    return unsub
  }, [currentUser])

  function formatTime(ts) {
    if (!ts?.toDate) return ''
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true }) } catch { return '' }
  }

  return (
    <div className="page-container" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) 0 var(--space-3)',
      }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
          Notifications
        </h1>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 'var(--space-8)',
          color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <p>No notifications yet.</p>
          <p style={{ marginTop: 4 }}>When someone likes or comments on your posts, you'll see it here.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {notifications.map(n => {
          const meta = TYPE_LABEL[n.type] || { icon: '📣', text: 'interacted with you' }
          const isUnread = !n.read

          return (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: isUnread ? 'rgba(160,120,255,0.07)' : 'var(--bg-card)',
                border: `1px solid ${isUnread ? 'rgba(160,120,255,0.2)' : 'var(--border-subtle)'}`,
                transition: 'background 0.2s',
              }}
            >
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Link to={`/u/${n.fromUsername}`} onClick={e => e.stopPropagation()}>
                  <Avatar src={n.fromPhotoURL} name={n.fromName} size={40} />
                </Link>
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  fontSize: 14, lineHeight: 1,
                  background: 'var(--bg-card)', borderRadius: '50%', padding: 1,
                }}>
                  {meta.icon}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                  <Link
                    to={`/u/${n.fromUsername}`}
                    style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {n.fromName || n.fromUsername}
                  </Link>
                  {' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{meta.text}</span>
                </p>

                {/* Post preview */}
                {n.postContent && n.postId && (
                  <Link
                    to={`/post/${n.postId}`}
                    style={{
                      display: 'block', marginTop: 4,
                      fontSize: 12, color: 'var(--text-muted)',
                      textDecoration: 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: '100%',
                    }}
                  >
                    "{n.postContent}{n.postContent?.length >= 80 ? '…' : ''}"
                  </Link>
                )}

                {/* Comment preview */}
                {n.commentText && (
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: 12, color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    "{n.commentText}"
                  </p>
                )}

                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatTime(n.createdAt)}
                </p>
              </div>

              {/* Unread dot */}
              {isUnread && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--brand-primary)', flexShrink: 0, marginTop: 6,
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
