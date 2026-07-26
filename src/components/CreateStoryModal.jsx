import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createStory, STORY_GRADIENTS, STORY_FONTS } from '../firebase/stories'
import toast from 'react-hot-toast'

export default function CreateStoryModal({ isOpen, onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [text, setText] = useState('')
  const [selectedGrad, setSelectedGrad] = useState(STORY_GRADIENTS[0].id)
  const [selectedFont, setSelectedFont] = useState(STORY_FONTS[0].id)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const currentGradObj = STORY_GRADIENTS.find(g => g.id === selectedGrad) || STORY_GRADIENTS[0]
  const currentFontObj = STORY_FONTS.find(f => f.id === selectedFont) || STORY_FONTS[0]

  async function handleSubmit() {
    if (!text.trim()) {
      toast.error('Type a story status first!')
      return
    }

    setLoading(true)
    try {
      await createStory({
        authorId: currentUser.uid,
        text: text.trim(),
        gradientId: selectedGrad,
        fontId: selectedFont,
      })

      toast.success('Story shared! ✨')
      setText('')
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
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 400, borderRadius: 24,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Text Story</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', width: 32, height: 32 }}
          >
            ✕
          </button>
        </div>

        {/* Live Text Canvas Preview */}
        <div style={{ padding: 16 }}>
          <div
            style={{
              width: '100%', height: 320, borderRadius: 20,
              background: currentGradObj.css,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', padding: 24,
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)',
            }}
          >
            <textarea
              placeholder="Tap to type your story..."
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={200}
              autoFocus
              style={{
                width: '100%', height: '100%', background: 'transparent',
                border: 'none', outline: 'none', resize: 'none',
                color: '#ffffff', fontSize: 24,
                fontFamily: currentFontObj.family,
                fontWeight: currentFontObj.weight,
                fontStyle: currentFontObj.style || 'normal',
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1.4,
              }}
            />
          </div>
        </div>

        {/* Font & Gradient Pickers */}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Font Picker */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {STORY_FONTS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFont(f.id)}
                style={{
                  padding: '4px 12px', borderRadius: 99,
                  border: selectedFont === f.id ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  background: selectedFont === f.id ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                  color: selectedFont === f.id ? '#fff' : 'var(--text-secondary)',
                  fontFamily: f.family, fontWeight: f.weight,
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Color Gradient Swatches */}
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

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="btn btn-primary"
            style={{
              width: '100%', borderRadius: 14, fontWeight: 700, padding: '10px 16px',
              opacity: loading || !text.trim() ? 0.6 : 1, fontSize: 14,
            }}
          >
            {loading ? 'Sharing...' : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
