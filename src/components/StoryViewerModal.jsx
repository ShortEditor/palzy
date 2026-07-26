import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { deleteStory } from '../firebase/stories'
import Avatar from './Avatar'
import toast from 'react-hot-toast'

export default function StoryViewerModal({ userGroups = [], initialUserIndex = 0, isOpen, onClose, onDeleteStory }) {
  const { currentUser } = useAuth()
  const [userIndex, setUserIndex] = useState(initialUserIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setUserIndex(initialUserIndex)
    setStoryIndex(0)
    setProgress(0)
  }, [initialUserIndex, isOpen])

  const currentGroup = userGroups[userIndex]
  const currentStory = currentGroup?.stories?.[storyIndex]

  // Auto-advance timer (5 seconds per story)
  useEffect(() => {
    if (!isOpen || !currentStory) return
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + 2 // 100% in 5s (50 steps * 100ms)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isOpen, userIndex, storyIndex, currentStory])

  if (!isOpen || !currentGroup || !currentStory) return null

  const isOwner = currentUser?.uid === currentGroup.authorId

  function handleNext() {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1)
    } else if (userIndex < userGroups.length - 1) {
      setUserIndex(prev => prev + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }

  function handlePrev() {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1)
    } else if (userIndex > 0) {
      setUserIndex(prev => prev - 1)
      setStoryIndex(userGroups[userIndex - 1].stories.length - 1)
    }
  }

  async function handleDelete() {
    if (!currentStory) return
    try {
      await deleteStory(currentStory.id, currentGroup.authorId)
      toast.success('Story deleted')
      onDeleteStory?.(currentStory.id)
      handleNext()
    } catch {
      toast.error('Could not delete story')
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    try {
      const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return ''
    }
  }

  // Adjust text font size depending on length of the text in viewer
  let fontSize = 28
  if (currentStory.text?.length > 120) fontSize = 18
  else if (currentStory.text?.length > 60) fontSize = 22

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1300,
        background: 'rgba(0, 0, 0, 0.95)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        animation: 'pwaFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 450, height: '100dvh',
          background: currentStory.gradient || 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', boxShadow: '0 0 100px rgba(0,0,0,0.8)',
          borderRadius: window.innerWidth > 600 ? 20 : 0,
          maxHeight: window.innerWidth > 600 ? '90vh' : '100dvh',
        }}
      >
        {/* Top Overlay: Progress Bars & Author Info */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '16px 16px 40px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}>
          {/* Progress Bars */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {currentGroup.stories.map((s, idx) => {
              let width = '0%'
              if (idx < storyIndex) width = '100%'
              if (idx === storyIndex) width = `${progress}%`
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1, height: 3, background: 'rgba(255,255,255,0.25)',
                    borderRadius: 2, overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%', background: '#ffffff', width,
                      transition: idx === storyIndex ? 'width 0.1s linear' : 'none',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Author Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar src={currentGroup.authorPhotoURL} name={currentGroup.authorName} size={38} />
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                  {currentGroup.authorName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}>
                  @{currentGroup.authorUsername} • {formatTime(currentStory.createdAt)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'rgba(255,59,48,0.2)', color: '#ff453a', border: '1px solid rgba(255,59,48,0.3)',
                    padding: '6px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                    fontWeight: 700, backdropFilter: 'blur(10px)',
                  }}
                >
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                  borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Text Story Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36 }}>
          <div style={{
            color: '#ffffff',
            fontSize: fontSize,
            fontFamily: currentStory.fontFamily || 'var(--font-sans)',
            fontWeight: currentStory.fontWeight || 800,
            fontStyle: currentStory.fontStyle || 'normal',
            textAlign: 'center',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
            lineHeight: 1.45,
          }}>
            {currentStory.text}
          </div>
        </div>

        {/* Left / Right Tap Controls */}
        <div
          onClick={handlePrev}
          style={{ position: 'absolute', top: 80, bottom: 0, left: 0, width: '35%', zIndex: 5, cursor: 'pointer' }}
        />
        <div
          onClick={handleNext}
          style={{ position: 'absolute', top: 80, bottom: 0, right: 0, width: '65%', zIndex: 5, cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
