import { useEffect, useRef, useState } from 'react'
import { videoPosterUrl, videoStreamUrl } from '../utils/video'
import Icon from './Icon'

/**
 * Bandwidth-friendly player. Until the viewer taps play it renders only a
 * small poster image (lazy-loaded); the video file is not requested at all.
 * Once playing it pauses automatically when scrolled out of view.
 */
export default function VideoPlayer({ url, ratio }) {
  const [active, setActive] = useState(false)
  const boxRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!active || !boxRef.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) videoRef.current?.pause()
    }, { threshold: 0.25 })
    io.observe(boxRef.current)
    return () => io.disconnect()
  }, [active])

  const aspect = ratio ? ratio.replace(':', ' / ') : '16 / 9'

  return (
    <div
      ref={boxRef}
      className="post-image post-video"
      style={{ aspectRatio: aspect }}
      onClick={e => e.stopPropagation()}
    >
      {active ? (
        <video
          ref={videoRef}
          src={videoStreamUrl(url)}
          poster={videoPosterUrl(url)}
          controls
          autoPlay
          playsInline
          preload="metadata"
          controlsList="nodownload"
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        />
      ) : (
        <button
          type="button"
          className="post-video-start"
          onClick={() => setActive(true)}
          aria-label="Play video"
        >
          <img src={videoPosterUrl(url)} alt="Video preview" loading="lazy" decoding="async" />
          <span className="post-video-play"><Icon name="play" size={28} /></span>
        </button>
      )}
    </div>
  )
}
