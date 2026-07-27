import { useState } from 'react'
import { useCall } from '../contexts/CallContext'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'

// ── SVG Icons ──────────────────────────────────────────────────
const PhoneIcon = ({ size = 18, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
)

const MicIcon = ({ size = 17, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
)

const MicOffIcon = ({ size = 17, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.16c.78-.12 1.53-.38 2.2-.75L19.73 21 21 19.73 4.27 3z"/>
  </svg>
)

const SpeakerIcon = ({ size = 17, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
)

const SpeakerOffIcon = ({ size = 17, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>
)

const AlertIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
)

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function ActiveCallUI() {
  const {
    callState, remoteUser, isMuted, isSpeaker, duration, errorMsg,
    endCall, toggleMute, toggleSpeaker,
  } = useCall()

  if ((callState !== 'active' && callState !== 'ringing_out') || !remoteUser) return null

  const isConnecting = callState === 'ringing_out'

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1900, width: '100%', maxWidth: 380, padding: '0 16px',
      animation: 'pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>

      {/* ── Error banner ──────────────────────────────── */}
      {errorMsg && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,69,58,0.18), rgba(192,57,43,0.18))',
          border: '1px solid rgba(255,69,58,0.35)',
          borderRadius: '14px 14px 0 0',
          padding: '10px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 8,
          color: '#ff7b74', fontSize: 12, fontWeight: 600, lineHeight: 1.4,
        }}>
          <AlertIcon size={14} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button
            onClick={() => {/* dismiss handled by context on reconnect */}}
            style={{ background: 'none', border: 'none', color: '#ff7b74', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Main call card ────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
        borderRadius: errorMsg ? '0 0 24px 24px' : 24,
        padding: '16px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={remoteUser.photoURL} name={remoteUser.name} size={46} />
          {!isConnecting && (
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 10, height: 10, borderRadius: '50%',
              background: errorMsg ? '#ff9500' : '#30d158',
              border: '2px solid #1a1a2e',
              transition: 'background 0.3s',
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
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isConnecting ? (
              <span style={{ animation: 'callPulseText 1s ease infinite' }}>Calling…</span>
            ) : errorMsg ? (
              <span style={{ color: '#ff9500' }}>Connection issue</span>
            ) : (
              <>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30d158', display: 'inline-block' }} />
                {formatDuration(duration)}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isConnecting && (
            <>
              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute mic' : 'Mute mic'}
                style={callControlBtn(isMuted, 'red')}
              >
                {isMuted ? <MicOffIcon size={17} /> : <MicIcon size={17} />}
              </button>

              {/* Speaker toggle */}
              <button
                onClick={toggleSpeaker}
                title={isSpeaker ? 'Switch to earpiece' : 'Switch to speaker'}
                style={callControlBtn(isSpeaker, 'blue')}
              >
                {isSpeaker ? <SpeakerIcon size={17} /> : <SpeakerOffIcon size={17} />}
              </button>
            </>
          )}

          {/* End call */}
          <button
            onClick={endCall}
            title="End call"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff453a, #c0392b)',
              border: 'none', color: '#fff',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,69,58,0.45)',
              transform: 'rotate(135deg)',
              transition: 'box-shadow 0.15s',
            }}
          >
            <PhoneIcon size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pwaSlideUp {
          from { transform: translateX(-50%) translateY(40px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes callPulseText {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}

function callControlBtn(active, color) {
  const colors = {
    red:  { bg: 'rgba(255,69,58,0.22)',  border: 'rgba(255,69,58,0.4)',  text: '#ff453a' },
    blue: { bg: 'rgba(10,132,255,0.22)', border: 'rgba(10,132,255,0.4)', text: '#0a84ff' },
  }
  const c = active ? colors[color] : null
  return {
    width: 38, height: 38, borderRadius: '50%',
    background:   active ? c.bg   : 'rgba(255,255,255,0.1)',
    border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.12)'}`,
    color:        active ? c.text : '#fff',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }
}
