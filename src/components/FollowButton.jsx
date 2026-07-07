import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { followUser, unfollowUser } from '../firebase/follows'
import toast from 'react-hot-toast'

/**
 * Reusable Follow / Unfollow button.
 * Props:
 *   targetUid    – uid of the user to follow
 *   initialState – boolean, whether currentUser already follows them
 *   onToggle     – optional callback(newFollowState)
 *   size         – 'sm' | 'md' (default 'sm')
 */
export default function FollowButton({ targetUid, initialState = false, onToggle, size = 'sm' }) {
  const { currentUser } = useAuth()
  const [following, setFollowing] = useState(initialState)
  const [loading, setLoading]     = useState(false)

  // Don't show if viewing own profile
  if (!currentUser || currentUser.uid === targetUid) return null

  async function handleToggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
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

  const btnSize = size === 'sm' ? 'btn-sm' : ''

  return (
    <button
      id={`btn-follow-${targetUid}`}
      className={`btn ${following ? 'btn-outline' : 'btn-primary'} ${btnSize}`}
      onClick={handleToggle}
      disabled={loading}
      style={{ minWidth: 80 }}
    >
      {loading
        ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
        : following ? 'Following' : 'Follow'
      }
    </button>
  )
}
