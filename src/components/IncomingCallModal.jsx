import { useEffect, useRef } from 'react'
import { useCall } from '../contexts/CallContext'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'

export default function IncomingCallModal() {
  const { callState, remoteUser, acceptCall, declineCall } = useCall()
  const ringRef = useRef(null)

  // Play a simple ring tone
  useEffect(() => {
    if (callState !== 'ringing_in') return
    let ctx, oscillator, gainNode
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
      gainNode.connect(ctx.destination)

      let playing = true
      function ring() {
        if (!playing) return
        oscillator = ctx.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
        oscillator.connect(gainNode)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.3)
        setTimeout(() => { if (playing) ring() }, 1200)
      }
      ring()
      return () => { playing = false; ctx.close() }
    } catch {}
  }, [callState])

  if (callState !== 'ringing_in' || !remoteUser) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'pwaFadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 32, padding: '48px 36px', textAlign: 'center',
        width: '100%', maxWidth: 340,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        {/* Pulse ring animation */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            border: '2px solid rgba(124,77,255,0.4)',
            animation: 'callPulse 1.5s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: -24, borderRadius: '50%',
            border: '2px solid rgba(124,77,255,0.2)',
            animation: 'callPulse 1.5s ease-out infinite 0.3s',
          }} />
          <Avatar src={remoteUser.photoURL} name={remoteUser.name} size={88} />
        </div>

        {/* Name */}
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#fff',
          marginBottom: 4, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6,
        }}>
          {remoteUser.name}
          {remoteUser.isVerified && <VerifiedBadge size={16} />}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
          @{remoteUser.username}
        </div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600,
          letterSpacing: 1, marginBottom: 48,
        }}>
          📞 Incoming voice call…
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
          {/* Decline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={declineCall}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff453a, #c0392b)',
                border: 'none', cursor: 'pointer', fontSize: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(255,69,58,0.45)',
                transform: 'rotate(135deg)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,69,58,0.65)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,69,58,0.45)'}
            >
              📞
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Decline</span>
          </div>

          {/* Accept */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={acceptCall}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'linear-gradient(135deg, #30d158, #1a9944)',
                border: 'none', cursor: 'pointer', fontSize: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(48,209,88,0.45)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                animation: 'callBounce 0.6s ease infinite alternate',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 12px 32px rgba(48,209,88,0.65)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(48,209,88,0.45)'}
            >
              📞
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Accept</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes callPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes callBounce {
          from { transform: translateY(0px); }
          to { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
