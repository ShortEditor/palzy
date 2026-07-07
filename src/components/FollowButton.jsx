import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { followUser, unfollowUser, isFollowing as checkFollowing } from '../firebase/follows'
import toast from 'react-hot-toast'

/**
 * Reusable Follow / Unfollow button.
 * Props:
 *   targetUid    – uid of the user to follow
 *   initialState – optional boolean hint; if omitted, checks Firestore on mount
 *   onToggle     – optional callback(newFollowState)
 *   size         – 'sm' | 'md' (default 'sm')
 */
export default function FollowButton({ targetUid, initialState, onToggle, size = 'sm' }) {
  const { currentUser } = useAuth()
  const [following, setFollowing] = useState(initialState ?? false)
  const [loading, setLoading]     = useState(initialState === undefined) // check on mount if not given
  const [checking, setChecking]   = useState(initialState === undefined)

  // If initialState not provided, check Firestore on mount
  useEffect(() => {
    if (!currentUser || !targetUid || initialState !== undefined) return
    setChecking(true)
    checkFollowing(currentUser.uid, targetUid)
      .then(state => { setFollowing(state) })
      .catch(console.error)
      .finally(() => { setLoading(false); setChecking(false) })
  }, [currentUser, targetUid, initialState])

  // Sync if initialState prop changes (e.g. parent re-checks)
  useEffect(() => {
    if (initialState !== undefined) {
      setFollowing(initialState)
      setLoading(false)
    }
  }, [initialState])

  // Don't show if viewing own profile
  if (!currentUser || currentUser.uid === targetUid) return null

  async function handleToggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (loading || checking) return
    setLoading(true)

    const next = !following
    setFollowing(next) // optimistic

    try {
      if (next) {
        await followUser(currentUser.uid, targetUid)
        toast.success('Following! 🎉')
      } else {
        await unfollowUser(currentUser.uid, targetUid)
        toast('Unfollowed.')
      }
      onToggle?.(next)
    } catch (err) {
      setFollowing(!next) // revert on error
      toast.error('Could not update follow.')
    } finally {
      setLoading(false)
    }
  }

  const [hovered, setHovered] = useState(false)

  const btnSize = size === 'sm' ? 'btn-sm' : ''

  // When following + hovered → show "Unfollow" in red
  const isUnfollowHover = following && hovered && !loading && !checking

  return (
    <button
      id={`btn-follow-${targetUid}`}
      className={`btn ${isUnfollowHover ? 'btn-danger' : following ? 'btn-outline' : 'btn-primary'} ${btnSize}`}
      onClick={handleToggle}
      disabled={loading || checking}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ minWidth: 92, transition: 'all var(--dur-fast)' }}
    >
      {(loading || checking)
        ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
        : isUnfollowHover
          ? 'Unfollow'
          : following ? 'Following' : 'Follow'
      }
    </button>
  )
}
