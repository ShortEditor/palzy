import { useEffect } from 'react'
import { useCall } from '../contexts/CallContext'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'

// ── SVG icons ──────────────────────────────────────────────────
const PhoneIcon = ({ size = 24, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
)

const PhoneOffIcon = ({ size = 24, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M23.54 16.03l-2.73-2.73c-.55-.55-1.46-.55-2.01 0l-1.62 1.62c-.16.16-.39.19-.57.1-1.37-.74-2.67-1.68-3.85-2.86L1.02 0.27C.61-.14-.14.61.27 1.02l4.19 4.19C3.64 6.01 3 6.98 3 8.09c0 1.25.2 2.45.57 3.57.12.35.03.74-.25 1.02l-2.2 2.2c-.27.27-.36.67-.24 1.02.37 1.12.57 2.33.57 3.57 0 .55.45 1 1 1H6c.55 0 1-.45 1-1 0-1.25-.2-2.45-.57-3.57a.996.996 0 01.25-1.02l.81-.81 1.87 1.87c-.01.01-.02.02-.03.03-1.56 1.56-1.56 4.09 0 5.66l2.73 2.73c.55.55 1.46.55 2.01 0l8.47-8.47c.56-.56.56-1.47 0-2.02z"/>
  </svg>
)

const MicIcon = ({ size = 20, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
)

const MicOffIcon = ({ size = 20, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.16c.78-.12 1.53-.38 2.2-.75L19.73 21 21 19.73 4.27 3z"/>
  </svg>
)

export default function IncomingCallModal() {
  const { callState, remoteUser, acceptCall, declineCall } = useCall()

  // Play a simple chime ringtone
  useEffect(() => {
    if (callState !== 'ringing_in') return
    let ctx, playing = true

    async function ring() {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
        const gainNode = ctx.createGain()
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
        gainNode.connect(ctx.destination)

        function chime() {
          if (!playing) return
          ;[880, 660].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, ctx.currentTime)
            osc.connect(gainNode)
            osc.start(ctx.currentTime + i * 0.15)
            osc.stop(ctx.currentTime + i * 0.15 + 0.18)
          })
          setTimeout(() => { if (playing) chime() }, 1200)
        }
        chime()
      } catch {}
    }
    ring()

    return () => {
      playing = false
      try { ctx?.close() } catch {}
    }
  }, [callState])

  if (callState !== 'ringing_in' || !remoteUser) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'pwaFadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
        borderRadius: 32, padding: '52px 40px', textAlign: 'center',
        width: '100%', maxWidth: 340,
        boxShadow: '0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        {/* Pulsing avatar rings */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
          {[12, 26, 40].map((offset, i) => (
            <div key={i} style={{
              position: 'absolute',
              inset: -offset,
              borderRadius: '50%',
              border: `2px solid rgba(124,77,255,${0.4 - i * 0.12})`,
              animation: `callPulse 1.6s ease-out ${i * 0.25}s infinite`,
            }} />
          ))}
          <Avatar src={remoteUser.photoURL} name={remoteUser.name} size={88} />
        </div>

        {/* Name + handle */}
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {remoteUser.name}
          {remoteUser.isVerified && <VerifiedBadge size={16} />}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
          @{remoteUser.username}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
          color: 'rgba(255,255,255,0.55)', marginBottom: 52,
          background: 'rgba(255,255,255,0.07)', padding: '5px 14px', borderRadius: 99,
        }}>
          <PhoneIcon size={13} />
          INCOMING VOICE CALL
        </div>

        {/* Accept / Decline buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48 }}>
          {/* Decline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <button
              onClick={declineCall}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff453a, #c0392b)',
                border: 'none', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(255,69,58,0.45)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,69,58,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,69,58,0.45)' }}
            >
              <PhoneOffIcon size={28} />
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Decline</span>
          </div>

          {/* Accept */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <button
              onClick={acceptCall}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'linear-gradient(135deg, #30d158, #1a9944)',
                border: 'none', cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(48,209,88,0.45)',
                animation: 'callBounce 0.65s ease infinite alternate',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 12px 32px rgba(48,209,88,0.6)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(48,209,88,0.45)'}
            >
              <PhoneIcon size={28} />
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Accept</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes callPulse {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes callBounce {
          from { transform: translateY(0px); }
          to   { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  )
}
