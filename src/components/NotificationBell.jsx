import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenUnreadCount } from '../firebase/notifications'

export default function NotificationBell() {
  const { currentUser } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    const unsub = listenUnreadCount(currentUser.uid, setUnread)
    return unsub
  }, [currentUser])

  if (!currentUser) return null

  return (
    <Link
      to="/notifications"
      id="notification-bell"
      title="Notifications"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: unread > 0 ? 'rgba(160,120,255,0.12)' : 'transparent',
        color: unread > 0 ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
        textDecoration: 'none',
        transition: 'all 0.2s',
        fontSize: 18,
      }}
    >
      🔔
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 99,
            background: 'var(--brand-primary)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            animation: 'pwaFadeIn 0.2s ease',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
