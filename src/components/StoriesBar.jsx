import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveStories, STORY_GRADIENTS } from '../firebase/stories'
import { getFollowingIds } from '../firebase/follows'
import Avatar from './Avatar'
import CreateStoryModal from './CreateStoryModal'
import StoryViewerModal from './StoryViewerModal'

export default function StoriesBar() {
  const { currentUser, userProfile } = useAuth()
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [activeUserIndex, setActiveUserIndex] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    loadStories()
  }, [currentUser])

  async function loadStories() {
    try {
      setLoading(true)
      const followingIds = await getFollowingIds(currentUser.uid)
      const groups = await getActiveStories(currentUser.uid, followingIds)
      setUserGroups(groups)
    } catch (err) {
      console.error('loadStories error:', err)
    } finally {
      setLoading(false)
    }
  }

  const myGroup = userGroups.find(g => g.authorId === currentUser?.uid)

  function handleOpenViewer(idx) {
    setActiveUserIndex(idx)
    setIsViewerOpen(true)
  }

  const RING = 'linear-gradient(135deg, #a078ff 0%, #f056b0 50%, #ff8c42 100%)'

  return (
    <>
      {/* Stories strip */}
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 0 12px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>

        {/* ── Your Story (Add / View) ── */}
        <button
          onClick={() => {
            if (myGroup?.stories?.length > 0) {
              handleOpenViewer(userGroups.findIndex(g => g.authorId === currentUser.uid))
            } else {
              setIsCreateOpen(true)
            }
          }}
          style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6, cursor: 'pointer',
            background: 'none', border: 'none', padding: 0, width: 72,
          }}
        >
          {/* Ring + Avatar */}
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            {/* gradient ring or dashed ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              padding: 2.5,
              background: myGroup?.stories?.length > 0
                ? RING
                : 'transparent',
              border: myGroup?.stories?.length > 0
                ? 'none'
                : '2px dashed var(--border-normal)',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'var(--bg-card)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                <Avatar src={userProfile?.photoURL} name={userProfile?.name} size={54} />
              </div>
            </div>

            {/* + badge */}
            {(!myGroup || myGroup.stories.length === 0) && (
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--brand-primary)', color: '#fff',
                fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-card)', lineHeight: 1,
              }}>+</div>
            )}
          </div>

          <span style={{
            fontSize: 11, fontWeight: 600,
            color: myGroup?.stories?.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
            width: 64, textAlign: 'center', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {myGroup?.stories?.length > 0 ? 'Your story' : 'Add story'}
          </span>
        </button>

        {/* ── Other users ── */}
        {userGroups
          .filter(g => g.authorId !== currentUser?.uid)
          .map(group => {
            const idx = userGroups.findIndex(g => g.authorId === group.authorId)
            // First story gradient for a hint of color in the ring preview
            const storyGrad = group.stories[0]?.gradient || RING

            return (
              <button
                key={group.authorId}
                onClick={() => handleOpenViewer(idx)}
                style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: 'none', border: 'none', padding: 0, width: 72,
                }}
              >
                <div style={{ position: 'relative', width: 64, height: 64 }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    padding: 2.5, background: RING,
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: 'var(--bg-card)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Avatar src={group.authorPhotoURL} name={group.authorName} size={54} />
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
                  width: 64, textAlign: 'center', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {group.authorName?.split(' ')[0] || group.authorUsername}
                </span>
              </button>
            )
          })}
      </div>

      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadStories}
      />
      <StoryViewerModal
        isOpen={isViewerOpen}
        userGroups={userGroups}
        initialUserIndex={activeUserIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteStory={loadStories}
      />
    </>
  )
}
