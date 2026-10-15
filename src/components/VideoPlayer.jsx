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

  function onTimeUpdate() {
    const v = videoRef.current
    if (v && barRef.current && v.duration) barRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`
  }

  const aspect = ratio ? ratio.replace(':', ' / ') : '16 / 9'
  const block = e => e.preventDefault()

  return (
    <div
      ref={boxRef}
      className="post-image post-video"
      style={{ aspectRatio: aspect }}
      onClick={e => e.stopPropagation()}
      onContextMenu={block}
    >
      {active ? (
        <div className="post-video-start" onClick={toggle} role="button" tabIndex={0} aria-label={playing ? 'Pause video' : 'Play video'}
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
