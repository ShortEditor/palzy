import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Icon from './Icon'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import toast from 'react-hot-toast'

export default function MobileMenuModal({ isOpen, onClose }) {
  const { userProfile, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isDark = theme === 'dark'

  async function handleLogout() {
    onClose()
    await logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  function handleNav(path) {
    onClose()
    navigate(path)
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation & Legal Menu"
      style={{ zIndex: 1200 }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 440,
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Header & User Profile Preview */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {userProfile ? (
            <div
              onClick={() => handleNav(`/u/${userProfile.username}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
            >
              <Avatar src={userProfile.photoURL} name={userProfile.name} size="md" />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  <span className="truncate">{userProfile.name}</span>
                  {userProfile.isVerified && <VerifiedBadge size={14} />}
                </div>
                <div className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  @{userProfile.username}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
              Menu
            </div>
          )}

          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close menu"
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Support & Legal (The requested pages) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            padding: '4px 8px',
          }}>
            Support & Legal
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}>
            <button
              onClick={() => handleNav('/about')}
              style={cardButtonStyle}
            >
              <span style={{ color: 'var(--brand-primary)', display: 'flex' }}><Icon name="info" size={18} /></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>About</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Story & Mission</div>
              </div>
            </button>

            <button
              onClick={() => handleNav('/help')}
              style={cardButtonStyle}
            >
              <span style={{ color: '#0ea5e9', display: 'flex' }}><Icon name="help" size={18} /></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Help Center</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>FAQ & Guides</div>
              </div>
            </button>

            <button
              onClick={() => handleNav('/privacy')}
              style={cardButtonStyle}
            >
              <span style={{ color: '#10b981', display: 'flex' }}><Icon name="shield" size={18} /></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Privacy Policy</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Data & Security</div>
              </div>
            </button>

            <button
              onClick={() => handleNav('/terms')}
              style={cardButtonStyle}
            >
              <span style={{ color: '#f59e0b', display: 'flex' }}><Icon name="document" size={18} /></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Terms of Service</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rules & Agreement</div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick App Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            padding: '4px 8px',
          }}>
            Explore & Community
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => handleNav('/campus')}
              style={listRowStyle}
            >
              <span style={{ display: 'flex', color: 'var(--brand-primary)' }}><Icon name="book" size={18} /></span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>Campus Hub</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>→</span>
            </button>

            <button
              onClick={() => handleNav('/notifications')}
              style={listRowStyle}
            >
              <span style={{ display: 'flex', color: '#ec4899' }}><Icon name="bell" size={18} /></span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>Notifications</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>→</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleNav('/admin')}
                style={{ ...listRowStyle, color: 'var(--brand-red)' }}
              >
                <span style={{ display: 'flex', color: 'var(--brand-red)' }}><Icon name="zap" size={18} /></span>
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Admin Panel</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--brand-red)' }}>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Theme Toggle & Logout */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={toggleTheme}
            className="btn btn-outline"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 'var(--font-size-sm)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={18} />
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--brand-red)',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <Icon name="logout" size={18} />
            Log Out
          </button>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 'var(--space-1)',
        }}>
          Palzy · Made for college · © 2026
        </div>
      </div>
    </div>
  )
}

const cardButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const listRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
  color: 'var(--text-primary)',
}
