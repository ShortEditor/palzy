import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createStory, STORY_GRADIENTS } from '../firebase/stories'
import { uploadImage } from '../utils/cloudinary'
import toast from 'react-hot-toast'

export default function CreateStoryModal({ isOpen, onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [text, setText] = useState('')
  const [selectedGrad, setSelectedGrad] = useState(STORY_GRADIENTS[0].id)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const currentGradObj = STORY_GRADIENTS.find(g => g.id === selectedGrad) || STORY_GRADIENTS[0]

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleSubmit() {
    if (!text.trim() && !imageFile) {
      toast.error('Add text or select an image for your story')
      return
    }

    setLoading(true)
    try {
      let imageURL = null
      if (imageFile) {
        imageURL = await uploadImage(imageFile, 'stories', currentUser.uid)
      }

      await createStory({
        authorId: currentUser.uid,
        text: text.trim(),
        gradientId: selectedGrad,
        imageURL,
      })

      toast.success('Story shared! ✨')
      setText('')
      removeImage()
      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Failed to post story:', err)
      toast.error('Could not share story.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 400, borderRadius: 24,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add to Story</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', width: 32, height: 32 }}
          >
            ✕
          </button>
        </div>

        {/* Live Story Canvas Preview */}
        <div style={{ padding: 16 }}>
          <div
            style={{
              width: '100%', height: 320, borderRadius: 16,
              background: imagePreview ? '#000' : currentGradObj.css,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', padding: 20,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)',
            }}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Story preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {text.trim() && (
                  <div style={{
                    position: 'absolute', bottom: 20, left: 16, right: 16,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                    color: '#fff', padding: '10px 14px', borderRadius: 12,
                    textAlign: 'center', fontSize: 15, fontWeight: 600,
                  }}>
                    {text}
                  </div>
                )}
                <button
                  onClick={removeImage}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    border: 'none', borderRadius: '50%', width: 28, height: 28,
                    cursor: 'pointer', fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <textarea
                placeholder="Type your story status..."
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={200}
                style={{
                  width: '100%', height: '100%', background: 'transparent',
                  border: 'none', outline: 'none', resize: 'none',
                  color: '#ffffff', fontSize: 22, fontWeight: 700,
                  textAlign: 'center', fontFamily: 'var(--font-sans)',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              />
            )}
          </div>
        </div>

        {/* Gradient Picker & Image Button */}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!imagePreview && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {STORY_GRADIENTS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGrad(g.id)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: g.css, border: selectedGrad === g.id ? '2px solid #fff' : 'none',
                    boxShadow: selectedGrad === g.id ? '0 0 0 2px var(--brand-primary)' : 'none',
                    cursor: 'pointer', transition: 'transform 0.15s',
                    transform: selectedGrad === g.id ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={g.name}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label
              className="btn btn-ghost"
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                fontSize: 13, padding: '8px 12px', borderRadius: 12,
              }}
            >
              📷 {imagePreview ? 'Change Photo' : 'Add Photo'}
              <input type="file" accept="image/*" onChange={handleFileChange} hidden />
            </label>

            <button
              onClick={handleSubmit}
              disabled={loading || (!text.trim() && !imageFile)}
              className="btn btn-primary"
              style={{
                flex: 1.5, borderRadius: 12, fontWeight: 700, padding: '8px 16px',
                opacity: loading || (!text.trim() && !imageFile) ? 0.6 : 1,
              }}
            >
              {loading ? 'Sharing...' : 'Share to Story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
