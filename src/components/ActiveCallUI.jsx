import { useCall } from '../contexts/CallContext'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function ActiveCallUI() {
  const { callState, remoteUser, isMuted, duration, endCall, toggleMute } = useCall()

  if ((callState !== 'active' && callState !== 'ringing_out') || !remoteUser) return null

  const isConnecting = callState === 'ringing_out'

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1900, width: '100%', maxWidth: 360, padding: '0 16px',
      animation: 'pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
        borderRadius: 24, padding: '16px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={remoteUser.photoURL} name={remoteUser.name} size={46} />
          {/* Green active dot */}
          {!isConnecting && (
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 10, height: 10, borderRadius: '50%',
              background: '#30d158', border: '2px solid #1a1a2e',
            }} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {remoteUser.name}
            {remoteUser.isVerified && <VerifiedBadge size={11} />}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: 1 }}>
            {isConnecting ? (
              <span style={{ animation: 'callPulseText 1s ease infinite' }}>Calling…</span>
            ) : (
              <>🟢 {formatDuration(duration)}</>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Mute toggle */}
          {!isConnecting && (
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: isMuted ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.1)',
                border: isMuted ? '1px solid rgba(255,69,58,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: isMuted ? '#ff453a' : '#fff',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
          )}

          {/* End call */}
          <button
            onClick={endCall}
            title="End call"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff453a, #c0392b)',
              border: 'none', color: '#fff',
              fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,69,58,0.4)',
              transform: 'rotate(135deg)',
              transition: 'box-shadow 0.15s',
            }}
          >
            📞
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pwaSlideUp {
          from { transform: translateX(-50%) translateY(40px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes callPulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
