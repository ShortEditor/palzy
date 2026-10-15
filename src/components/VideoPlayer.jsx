import { useEffect, useRef, useState } from 'react'
import { isS3Video, videoPosterUrl, videoStreamUrl, LOCKED_VIDEO_PROPS } from '../utils/video'
import { getVideoPlayUrl } from '../utils/videoStorage'
import Icon from './Icon'

/**
 * Minimal Instagram-style player: no native controls, no download/PiP/cast
 * options, no context menu. Tap anywhere to play or pause; a thin read-only
 * progress line shows position. Until the first tap only a lazy poster image
 * is loaded (the video file is not requested). Pauses when scrolled off screen.
 */
export default function VideoPlayer({ url, ratio, poster }) {
  const [active, setActive] = useState(false)
  const [src, setSrc] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [full, setFull] = useState(false)
  const tapRef = useRef(null)
  const boxRef = useRef(null)
  const videoRef = useRef(null)
  const barRef = useRef(null)
  const s3 = isS3Video(url)
  const posterSrc = s3 ? poster : videoPosterUrl(url)

  useEffect(() => {
    if (!active || !boxRef.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) videoRef.current?.pause()
    }, { threshold: 0.25 })
    io.observe(boxRef.current)
    return () => io.disconnect()
  }, [active])

  // Best-effort deterrent: black out and pause while the page is hidden or unfocused.
  useEffect(() => {
    if (!active) return
    const check = () => {
      const away = document.hidden || !document.hasFocus()
      setHidden(away)
      if (away) videoRef.current?.pause()
    }
    const away = () => { setHidden(true); videoRef.current?.pause() }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('blur', away)
    window.addEventListener('pagehide', away)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('blur', away)
      window.removeEventListener('pagehide', away)
      window.removeEventListener('focus', check)
    }
  }, [active])

  async function start() {
    if (busy) return
    setBusy(true)
    try {
      setSrc(s3 ? await getVideoPlayUrl(url) : videoStreamUrl(url))
      setActive(true)
    } catch { /* stay on the poster; tapping again retries */ }
    setBusy(false)
  }

  function toggle() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {}); else v.pause()
  }

  // Fullscreen of our own container (custom UI only). Falls back to a CSS
  // full-viewport mode where the Fullscreen API is unavailable (iPhone Safari).
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement
  function toggleFull() {
    const box = boxRef.current
    if (!box) return
    if (fsEl() === box) {
      ;(document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
      return
    }
    if (full) { setFull(false); return }
    const req = box.requestFullscreen || box.webkitRequestFullscreen
    if (req) {
      Promise.resolve(req.call(box)).catch(() => setFull(true))
    } else {
      setFull(true)
    }
  }

  // Single tap = play/pause (delayed slightly); double tap = fullscreen.
  function onTap() {
    if (tapRef.current) {
      clearTimeout(tapRef.current)
      tapRef.current = null
      toggleFull()
      return
    }
    tapRef.current = setTimeout(() => { tapRef.current = null; toggle() }, 250)
  }

  useEffect(() => () => clearTimeout(tapRef.current), [])

  useEffect(() => {
    if (!full) return
    const onKey = e => { if (e.key === 'Escape') setFull(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [full])

  function onTimeUpdate() {
    const v = videoRef.current
    if (v && barRef.current && v.duration) barRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`
  }

  const aspect = ratio ? ratio.replace(':', ' / ') : '16 / 9'
  const block = e => e.preventDefault()

  return (
    <div
      ref={boxRef}
      className={`post-image post-video${full ? ' post-video-full' : ''}`}
      style={full ? undefined : { aspectRatio: aspect }}
      onClick={e => e.stopPropagation()}
      onContextMenu={block}
    >
      {active ? (
        <div className="post-video-start" onClick={onTap} role="button" tabIndex={0} aria-label={playing ? 'Pause video' : 'Play video'}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() } }}>
          <video
            ref={videoRef}
            src={src}
            poster={posterSrc || undefined}
            autoPlay
            preload="metadata"
            {...LOCKED_VIDEO_PROPS}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={onTimeUpdate}
            onContextMenu={block}
            onDragStart={block}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', pointerEvents: 'none', filter: hidden ? 'blur(30px) brightness(0)' : 'none' }}
          />
          {!playing && <span className="post-video-play"><Icon name="play" size={28} /></span>}
          <button type="button" className="post-video-fs" aria-label="Toggle fullscreen"
            onClick={e => { e.stopPropagation(); toggleFull() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
          <span className="post-video-bar"><span ref={barRef} /></span>
        </div>
      ) : (
        <button type="button" className="post-video-start" onClick={start} aria-label="Play video">
          {posterSrc && <img src={posterSrc} alt="Video preview" loading="lazy" decoding="async" draggable={false} onContextMenu={block} />}
          <span className="post-video-play"><Icon name="play" size={28} /></span>
        </button>
      )}
    </div>
  )
}
