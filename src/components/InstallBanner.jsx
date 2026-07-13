import { useState, useEffect } from 'react'
import Icon from './Icon'

/**
 * PWA Install Banner
 * Listens for the browser's `beforeinstallprompt` event and shows
 * a non-intrusive banner prompting the user to install Palzy.
 * Dismissed state persists in localStorage.
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem('pwa-banner-dismissed')) return

    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return // iOS installed check

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 90, // above bottom nav
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(92vw, 380px)',
      zIndex: 300,
      background: 'linear-gradient(135deg, #1a0f36 0%, #0d1428 100%)',
      border: '1px solid rgba(160,120,255,0.3)',
      borderRadius: 20,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(160,120,255,0.1)',
      backdropFilter: 'blur(16px)',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* App icon */}
      <img
        src="/icon-192.png"
        alt="Palzy"
        style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, border: '1px solid rgba(160,120,255,0.2)' }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e2e3', fontFamily: 'var(--font-display)' }}>
          Install Palzy
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
          Add to home screen for the full app experience
        </div>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary-cont), var(--brand-accent))',
          color: '#fff',
          border: 'none',
          borderRadius: 99,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 4px 12px rgba(160,120,255,0.4)',
        }}
      >
        Install
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          flexShrink: 0,
        }}
        aria-label="Dismiss install banner"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
