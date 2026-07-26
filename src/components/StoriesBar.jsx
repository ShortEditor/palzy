import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveStories } from '../firebase/stories'
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

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      {/* Horizontal Carousel */}
      <div
        style={{
          display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 2px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        {/* Your Story item */}
        <div
          onClick={() => {
            if (myGroup && myGroup.stories.length > 0) {
              const myIdx = userGroups.findIndex(g => g.authorId === currentUser.uid)
              handleOpenViewer(myIdx >= 0 ? myIdx : 0)
            } else {
              setIsCreateOpen(true)
            }
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', flexShrink: 0, width: 68,
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 60, height: 60, borderRadius: '50%', padding: 2,
                background: myGroup?.stories?.length > 0
                  ? 'linear-gradient(135deg, #a078ff 0%, #e056fd 100%)'
                  : 'var(--border-subtle)',
              }}
            >
              <Avatar
                src={userProfile?.photoURL}
                name={userProfile?.name}
                size={56}
              />
            </div>
            {/* Plus icon if no stories */}
            {(!myGroup || myGroup.stories.length === 0) && (
              <div
                onClick={(e) => { e.stopPropagation(); setIsCreateOpen(true) }}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--brand-primary)', color: '#fff',
                  fontSize: 14, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-card)',
                }}
              >
                +
              </div>
            )}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
            textAlign: 'center', width: '100%', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {myGroup?.stories?.length > 0 ? 'Your story' : 'Add story'}
          </span>
        </div>

        {/* Other Users' Stories */}
        {userGroups
          .filter(g => g.authorId !== currentUser?.uid)
          .map((group) => {
            const actualIndex = userGroups.findIndex(g => g.authorId === group.authorId)
            return (
              <div
                key={group.authorId}
                onClick={() => handleOpenViewer(actualIndex)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  cursor: 'pointer', flexShrink: 0, width: 68,
                }}
              >
                <div
                  style={{
                    width: 60, height: 60, borderRadius: '50%', padding: 2.5,
                    background: 'linear-gradient(135deg, #a078ff 0%, #e056fd 100%)',
                    boxShadow: '0 2px 8px rgba(160, 120, 255, 0.3)',
                  }}
                >
                  <Avatar
                    src={group.authorPhotoURL}
                    name={group.authorName}
                    size={55}
                  />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
                  textAlign: 'center', width: '100%', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {group.authorName?.split(' ')[0] || group.authorUsername}
                </span>
              </div>
            )
          })}
      </div>

      {/* Create Modal */}
      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadStories}
      />

      {/* Viewer Modal */}
      <StoryViewerModal
        isOpen={isViewerOpen}
        userGroups={userGroups}
        initialUserIndex={activeUserIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteStory={loadStories}
      />
    </div>
  )
}
