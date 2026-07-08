import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import Icon from './Icon'

// ─── Canvas helper: extract the cropped region as a File ─────────────────────
async function getCroppedFile(imageSrc, pixelCrop, fileName = 'cropped.jpg') {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas is empty')); return }
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      resolve(file)
    }, 'image/jpeg', 0.92)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ─── ImageCropModal ───────────────────────────────────────────────────────────
// Props:
//   imageSrc   — object URL of the raw picked image
//   aspect     — number  (1 for avatar, 3 for banner)
//   cropShape  — 'round' | 'rect'
//   title      — modal heading
//   onCancel() — called when user closes without cropping
//   onCrop(file) — called with the cropped File
export default function ImageCropModal({ imageSrc, aspect, cropShape = 'rect', title = 'Crop Image', onCancel, onCrop }) {
  const [crop, setCrop]   = useState({ x: 0, y: 0 })
  const [zoom, setZoom]   = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [applying, setApplying] = useState(false)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleApply() {
    if (!croppedAreaPixels) return
    setApplying(true)
    try {
      const file = await getCroppedFile(imageSrc, croppedAreaPixels)
      onCrop(file)
    } catch (err) {
      console.error('Crop error:', err)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1100 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="modal-box"
        style={{ width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{title}</span>
          <button className="btn btn-ghost btn-icon" onClick={onCancel} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Cropper area */}
        <div style={{ position: 'relative', width: '100%', height: 320, background: '#111' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div style={{
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <Icon name="image" size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
            aria-label="Zoom"
          />
          <Icon name="image" size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>

        {/* Hint */}
        <p style={{
          padding: 'var(--space-2) var(--space-5) 0',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          Drag to reposition · Pinch or use the slider to zoom
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end',
          padding: 'var(--space-4) var(--space-5)',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleApply}
            disabled={applying}
          >
            {applying
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Applying…</>
              : <><Icon name="check" size={14} /> Apply Crop</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
