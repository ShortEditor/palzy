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
      await deleteStory(currentStory.id)
      toast.success('Story deleted')
      onDeleteStory?.(currentStory.id)
      handleNext()
    } catch {
      toast.error('Could not delete story')
    }
  }

  function formatTime(ts) {
    if (!ts?.toDate) return ''
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true }) } catch { return '' }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: '#000000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 420, height: '100dvh',
          background: currentStory.imageURL ? '#000' : (currentStory.gradient || '#111'),
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Top Overlay: Progress Bars & Author Info */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '12px 16px 30px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        }}>
          {/* Progress Bars */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {currentGroup.stories.map((s, idx) => {
              let width = '0%'
              if (idx < storyIndex) width = '100%'
              if (idx === storyIndex) width = `${progress}%`
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1, height: 3, background: 'rgba(255,255,255,0.3)',
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
              <Avatar src={currentGroup.authorPhotoURL} name={currentGroup.authorName} size={36} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                  {currentGroup.authorName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  {formatTime(currentStory.createdAt)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'rgba(255,0,0,0.4)', color: '#fff', border: 'none',
                    padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none',
                  borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {currentStory.imageURL ? (
            <img
              src={currentStory.imageURL}
              alt="Story"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              padding: 30, color: '#ffffff', fontSize: 24, fontWeight: 700,
              textAlign: 'center', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              textShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}>
              {currentStory.text}
            </div>
          )}

          {currentStory.imageURL && currentStory.text && (
            <div style={{
              position: 'absolute', bottom: 40, left: 20, right: 20,
              background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '12px 16px',
              borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}>
              {currentStory.text}
            </div>
          )}
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
