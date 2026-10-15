import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createStory, STORY_GRADIENTS, STORY_FONTS } from '../firebase/stories'
import toast from 'react-hot-toast'
import Icon from './Icon'
import { uploadImage } from '../utils/cloudinary'

// Downscale to max 1080px on the long side and re-encode as JPEG (~100-250KB).
async function shrinkImage(file, maxSide = 1080, quality = 0.82) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close?.()
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not process image')
  return new File([blob], 'story.jpg', { type: 'image/jpeg' })
}

export default function CreateStoryModal({ isOpen, onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [text, setText] = useState('')
  const [selectedGrad, setSelectedGrad] = useState(STORY_GRADIENTS[0].id)
  const [selectedFont, setSelectedFont] = useState(STORY_FONTS[0].id)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const [photo, setPhoto] = useState(null)       // compressed File
  const [photoUrl, setPhotoUrl] = useState(null)  // local preview

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const currentGradObj = STORY_GRADIENTS.find(g => g.id === selectedGrad) || STORY_GRADIENTS[0]
  const currentFontObj = STORY_FONTS.find(f => f.id === selectedFont) || STORY_FONTS[0]

  // Dynamic font sizing depending on length of text to prevent overflow
  let fontSize = 28
  if (text.length > 120) fontSize = 18
  else if (text.length > 60) fontSize = 22

  async function handlePick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Pick an image file.'); return }
    try {
      const small = await shrinkImage(f)
      if (photoUrl) URL.revokeObjectURL(photoUrl)
      setPhoto(small)
      setPhotoUrl(URL.createObjectURL(small))
    } catch {
      toast.error('Could not read that image.')
    }
  }

  function clearPhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhoto(null)
    setPhotoUrl(null)
  }

  async function handleSubmit() {
    if (!text.trim() && !photo) {
      toast.error('Add a photo or type a status first!')
      return
    }

    setLoading(true)
    try {
      const imageURL = photo ? await uploadImage(photo, 'stories', currentUser.uid) : null
      await createStory({
        imageURL,
        authorId: currentUser.uid,
        text: text.trim(),
        gradientId: selectedGrad,
        fontId: selectedFont,
      })

      toast.success('Story shared!', { icon: <Icon name="confetti" size={16} /> })
      setText('')
      clearPhoto()
      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Failed to post story:', err)
      toast.error('Could not share story.')
    } finally {
      setLoading(false)
    }
  }

  // Cycles to the next gradient when clicking the color button
  function handleCycleGradient() {
    const currentIdx = STORY_GRADIENTS.findIndex(g => g.id === selectedGrad)
    const nextIdx = (currentIdx + 1) % STORY_GRADIENTS.length
    setSelectedGrad(STORY_GRADIENTS[nextIdx].id)
  }

  // Cycles to the next font when clicking the font button
  function handleCycleFont() {
    const currentIdx = STORY_FONTS.findIndex(f => f.id === selectedFont)
    const nextIdx = (currentIdx + 1) % STORY_FONTS.length
    setSelectedFont(STORY_FONTS[nextIdx].id)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: currentGradObj.css,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        animation: 'pwaFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: 'env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px)',
      }}
    >
      {/* Immersive Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: 50, zIndex: 10,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.3)', color: '#fff', border: 'none',
            borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', transition: 'transform 0.1s active',
          }}
        >
          <Icon name="close" size={18} />
        </button>

        {/* Floating Quick Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} style={{ display: 'none' }} />
          <button
            onClick={() => (photo ? clearPhoto() : fileRef.current?.click())}
            aria-label={photo ? 'Remove photo' : 'Add photo'}
            style={{
              background: 'rgba(0,0,0,0.3)', color: '#fff', border: 'none',
              padding: '0 16px', height: 40, borderRadius: 20, cursor: 'pointer',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 4, backdropFilter: 'blur(10px)',
            }}
          >
            <Icon name={photo ? 'close' : 'image'} size={14} /> {photo ? 'Remove' : 'Photo'}
          </button>
          {/* Font cycler */}
          <button
            onClick={handleCycleFont}
            style={{
              background: 'rgba(0,0,0,0.3)', color: '#fff', border: 'none',
              padding: '0 16px', height: 40, borderRadius: 20, cursor: 'pointer',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 4, backdropFilter: 'blur(10px)',
            }}
          >
            <Icon name="textFont" size={14} /> {currentFontObj.name}
          </button>

          {/* Color cycler */}
          <button
            onClick={handleCycleGradient}
            style={{
              background: 'rgba(0,0,0,0.3)', color: '#fff', border: 'none',
              width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, backdropFilter: 'blur(10px)',
            }}
            title="Change Background"
          >
            <Icon name="palette" size={16} />
          </button>
        </div>
      </div>

      {photoUrl && (
        <img src={photoUrl} alt="Story preview" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'contain', background: '#000', zIndex: 0,
        }} />
      )}

      {/* Editor Main Canvas */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', width: '100%', maxWidth: 450, margin: '0 auto', zIndex: 1,
        ...(photoUrl ? { alignItems: 'flex-end' } : {}),
      }}>
        <textarea
          ref={textareaRef}
          placeholder={photo ? 'Add a caption...' : 'Type a status...'}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={200}
          style={{
            width: '100%', background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: '#ffffff', fontSize: fontSize,
            fontFamily: currentFontObj.family,
            fontWeight: currentFontObj.weight,
            fontStyle: currentFontObj.style || 'normal',
            textAlign: 'center',
            textShadow: '0 2px 12px rgba(0,0,0,0.35)',
            lineHeight: 1.4,
            padding: 20,
            caretColor: '#fff',
            maxHeight: '70%',
          }}
        />
      </div>

      {/* Bottom Bar */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        width: '100%', maxWidth: 450, margin: '0 auto 10px', zIndex: 10,
      }}>
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !photo)}
          style={{
            background: '#ffffff',
            color: 'var(--brand-primary-cont)',
            border: 'none',
            borderRadius: 24,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: loading || (!text.trim() && !photo) ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'Sharing...' : <><span>Share Story</span> <Icon name="arrowRight" size={16} /></>}
        </button>
      </div>
    </div>
  )
}
