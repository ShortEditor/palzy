import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createStory, STORY_GRADIENTS, STORY_FONTS } from '../firebase/stories'
import toast from 'react-hot-toast'

export default function CreateStoryModal({ isOpen, onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [text, setText] = useState('')
  const [selectedGrad, setSelectedGrad] = useState(STORY_GRADIENTS[0].id)
  const [selectedFont, setSelectedFont] = useState(STORY_FONTS[0].id)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef(null)

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
          ✕
        </button>

        {/* Floating Quick Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
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
            🔤 {currentFontObj.name}
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
            🎨
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', width: '100%', maxWidth: 450, margin: '0 auto',
      }}>
        <textarea
          ref={textareaRef}
          placeholder="Type a status..."
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
          disabled={loading || !text.trim()}
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
            opacity: loading || !text.trim() ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'Sharing...' : 'Share Story ➔'}
        </button>
      </div>
    </div>
  )
}
