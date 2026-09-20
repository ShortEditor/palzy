import { useState, useRef, useEffect, useCallback } from 'react'
import Icon from './Icon'

const RATIO_MAP = {
  '1:1':  1,
  '4:5':  4 / 5,
  '3:4':  3 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '4:3':  4 / 3,
  '3:2':  3 / 2,
}

export default function ImageCarousel({ imageURLs = [], imageRatio = '1:1', showIndicators = true }) {
  const [current, setCurrent] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const trackRef = useRef(null)
  const count = imageURLs.length

  // Reset index if imageURLs change
  useEffect(() => { setCurrent(0) }, [imageURLs])

  const goTo = useCallback((idx) => {
    setCurrent(Math.max(0, Math.min(idx, count - 1)))
  }, [count])

  const prev = useCallback(() => goTo(current - 1), [current, goTo])
  const next = useCallback(() => goTo(current + 1), [current, goTo])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    const track = trackRef.current
    if (track) track.addEventListener('keydown', handleKey)
    return () => { if (track) track.removeEventListener('keydown', handleKey) }
  }, [prev, next])

  // Touch handlers for swipe
  function onTouchStart(e) {
    setTouchStart(e.touches[0].clientX)
    setIsDragging(true)
  }

  function onTouchMove(e) {
    if (touchStart === null) return
    setTouchDelta(e.touches[0].clientX - touchStart)
  }

  function onTouchEnd() {
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta < 0 && current < count - 1) next()
      else if (touchDelta > 0 && current > 0) prev()
    }
    setTouchStart(null)
    setTouchDelta(0)
    setIsDragging(false)
  }

  // Mouse drag for desktop
  function onMouseDown(e) {
    setTouchStart(e.clientX)
    setIsDragging(true)
  }

  function onMouseMove(e) {
    if (touchStart === null || !isDragging) return
    setTouchDelta(e.clientX - touchStart)
  }

  function onMouseUp() {
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta < 0 && current < count - 1) next()
      else if (touchDelta > 0 && current > 0) prev()
    }
    setTouchStart(null)
    setTouchDelta(0)
    setIsDragging(false)
  }

  if (!imageURLs.length) return null

  // Single image — no carousel needed
  if (count === 1) {
    return (
      <div className="post-image" style={imageRatio && imageRatio !== '1:1' ? { aspectRatio: imageRatio.replace(':', ' / ') } : undefined}>
        <img src={imageURLs[0]} alt="Post image" loading="lazy" style={imageRatio ? { objectFit: 'cover', width: '100%', height: '100%' } : undefined} />
      </div>
    )
  }

  const ratio = RATIO_MAP[imageRatio] || 1
  const translateX = isDragging
    ? `calc(-${current * 100}% + ${touchDelta}px)`
    : `-${current * 100}%`

  return (
    <div
      className="image-carousel"
      ref={trackRef}
      tabIndex={0}
      role="region"
      aria-label={`Image carousel, ${count} images`}
      aria-roledescription="carousel"
    >
      {/* Viewport */}
      <div
        className="carousel-viewport"
        style={{ aspectRatio: `${ratio}` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="carousel-track"
          style={{
            transform: `translateX(${translateX})`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {imageURLs.map((url, i) => (
            <div className="carousel-slide" key={i} aria-hidden={i !== current}>
              <img
                src={url}
                alt={`Image ${i + 1} of ${count}`}
                loading={i <= 1 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Counter badge */}
        <div className="carousel-counter">
          {current + 1} / {count}
        </div>

        {/* Arrow buttons */}
        {current > 0 && (
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous image"
          >
            <Icon name="arrow_left" size={18} />
          </button>
        )}
        {current < count - 1 && (
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next image"
          >
            <Icon name="arrow_right" size={18} />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {showIndicators && count > 1 && (
        <div className="carousel-dots">
          {imageURLs.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === current ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
