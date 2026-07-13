import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return

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
    setShow(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9999,
        background: 'linear-gradient(160deg, #1a0f36 0%, #0d1428 60%, #0a1020 100%)',
        borderTop: '1px solid rgba(160,120,255,0.25)',
        borderRadius: '28px 28px 0 0',
        padding: '32px 28px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20,
        animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(160,120,255,0.1)',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <style>{`
          @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp {
            from { transform: translateY(100%) }
            to   { transform: translateY(0) }
          }
        `}</style>

        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 99,
          background: 'rgba(255,255,255,0.15)',
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        }} />

        {/* App icon */}
        <div style={{ position: 'relative' }}>
          <img
            src="/icon-512.png"
            alt="Palzy"
            style={{
              width: 88, height: 88,
              borderRadius: 22,
              border: '2px solid rgba(160,120,255,0.3)',
              boxShadow: '0 8px 32px rgba(160,120,255,0.35)',
            }}
          />
          {/* Glow ring */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: 30,
            background: 'radial-gradient(circle, rgba(160,120,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22, fontWeight: 800,
            background: 'linear-gradient(135deg, #a078ff 0%, #0bc5de 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            Install Palzy
          </div>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.5, maxWidth: 260, margin: '0 auto',
          }}>
            Get the full app experience — instant access from your home screen, offline-ready.
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['⚡ Instant load', '📲 Home screen', '🔔 Notifications'].map(f => (
            <span key={f} style={{
              fontSize: 11, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 99, padding: '4px 12px',
              color: 'rgba(255,255,255,0.55)',
            }}>{f}</span>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <button
            onClick={handleInstall}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #a078ff 0%, #0bc5de 100%)',
              color: '#fff',
              fontSize: 16, fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
              boxShadow: '0 8px 24px rgba(160,120,255,0.45)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = ''}
          >
            Install Now
          </button>

          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            Not Now
          </button>
        </div>
      </div>
    </>
  )
}
