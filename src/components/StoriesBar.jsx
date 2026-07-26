import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveStories } from '../firebase/stories'
import { getFollowingIds } from '../firebase/follows'
import Avatar from './Avatar'
import CreateStoryModal from './CreateStoryModal'
import StoryViewerModal from './StoryViewerModal'
import VerifiedBadge from './VerifiedBadge'

export default function StoriesBar() {
  const { currentUser, userProfile } = useAuth()
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewedStoryIds, setViewedStoryIds] = useState([])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [activeUserIndex, setActiveUserIndex] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    loadStories()
    
    // Load viewed stories from localStorage
    try {
      const stored = localStorage.getItem('palzy_viewed_stories')
      if (stored) {
        setViewedStoryIds(JSON.parse(stored))
      }
    } catch {}
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

  // Reload seen IDs from localStorage to update rings on UI
  const refreshSeenIds = () => {
    try {
      const stored = localStorage.getItem('palzy_viewed_stories')
      if (stored) {
        setViewedStoryIds(JSON.parse(stored))
      }
    } catch {}
  }

  const myGroup = userGroups.find(g => g.authorId === currentUser?.uid)

  function handleOpenViewer(idx) {
    setActiveUserIndex(idx)
    setIsViewerOpen(true)
  }

  const GRADIENT_RING = 'linear-gradient(135deg, #a078ff 0%, #f056b0 50%, #ff8c42 100%)'
  const SEEN_RING = 'var(--border-normal)'

  // Check if a group of stories has been fully watched
  const isGroupSeen = (group) => {
    if (!group?.stories || group.stories.length === 0) return true
    return group.stories.every(s => viewedStoryIds.includes(s.id))
  }

  if (loading && userGroups.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 0 12px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-input)', animate: 'pulse' }} />
      </div>
    )
  }

  return (
    <>
      {/* Stories strip */}
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 0 12px',
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
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              padding: 2.5,
              background: myGroup?.stories?.length > 0
                ? (isGroupSeen(myGroup) ? SEEN_RING : GRADIENT_RING)
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
            color: myGroup?.stories?.length > 0 
              ? (isGroupSeen(myGroup) ? 'var(--text-muted)' : 'var(--text-primary)') 
              : 'var(--text-muted)',
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
            const seen = isGroupSeen(group)

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
                    padding: 2.5, 
                    background: seen ? SEEN_RING : GRADIENT_RING,
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
                  fontSize: 11, 
                  fontWeight: seen ? 500 : 700, 
                  color: seen ? 'var(--text-muted)' : 'var(--text-primary)',
                  width: 64, textAlign: 'center', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2
                }}>
                  {group.authorName?.split(' ')[0] || group.authorUsername}
                  {group.authorIsVerified && <VerifiedBadge size={10} />}
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
        onClose={() => {
          setIsViewerOpen(false)
          refreshSeenIds() // update rings when closed
        }}
        onDeleteStory={loadStories}
      />
    </>
  )
}
