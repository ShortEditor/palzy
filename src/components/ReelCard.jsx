import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike } from '../firebase/posts'
import Avatar from './Avatar'
import Icon from './Icon'
import VerifiedBadge from './VerifiedBadge'
import FollowButton from './FollowButton'
import toast from 'react-hot-toast'

export default function ReelCard({ reel, authorProfile, isLiked: initialLiked = false, onDelete }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked]         = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(reel.likeCount ?? 0)
  const [liking, setLiking]       = useState(false)
  const [showCaption, setShowCaption] = useState(false)

  const isOwner = currentUser?.uid === reel.authorId
  const handle = authorProfile?.username ?? reel.authorId?.slice(0, 8)
  const displayName = authorProfile?.name ?? 'User'
  const photoURL = authorProfile?.photoURL
  const timeAgo = reel.createdAt?.toDate
    ? formatDistanceToNow(reel.createdAt.toDate(), { addSuffix: true })
    : 'just now'

  async function handleLike(e) {
    e.stopPropagation()
    if (liking) return
    setLiking(true)
    setLiked(p => !p)
    setLikeCount(p => liked ? p - 1 : p + 1)
    try {
      await toggleLike(reel.id, currentUser.uid)
    } catch {
      setLiked(p => !p)
      setLikeCount(p => liked ? p + 1 : p - 1)
      toast.error('Could not update like.')
    } finally {
      setLiking(false)
    }
  }

  return (
    <div className="reel-card" data-reel-id={reel.id}>
      {/* Background image */}
      <img
        src={reel.imageURL}
        alt=""
        className="reel-bg"
        loading="lazy"
        decoding="async"
      />

      {/* Gradient overlay */}
      <div className="reel-overlay" />

      {/* Bottom info strip */}
      <div className="reel-info">
        {/* Author row */}
        <div className="reel-author-row">
          <Link
            to={`/u/${handle}`}
            className="reel-author-link"
            onClick={e => e.stopPropagation()}
          >
            <div className="avatar-ring reel-avatar">
              <Avatar src={photoURL} name={displayName} size="md" />
            </div>
            <div>
              <div className="reel-author-name">
                {displayName}
                {authorProfile?.isVerified && <VerifiedBadge size={13} />}
              </div>
              <div className="reel-author-handle">@{handle} · {timeAgo}</div>
            </div>
          </Link>

          {!isOwner && (
            <span onClick={e => e.stopPropagation()}>
              <FollowButton targetUid={reel.authorId} size="sm" />
            </span>
          )}
        </div>

        {/* Caption */}
        {reel.content && (
          <div
            className={`reel-caption ${showCaption ? 'expanded' : ''}`}
            onClick={() => setShowCaption(p => !p)}
          >
            {showCaption ? reel.content : reel.content.slice(0, 80) + (reel.content.length > 80 ? '… more' : '')}
          </div>
        )}
      </div>

      {/* Right action rail */}
      <div className="reel-actions">
        {/* Like */}
        <button
          id={`btn-reel-like-${reel.id}`}
          className={`reel-action-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={liking}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <div className="reel-action-icon">
            <Icon name={liked ? 'heartFilled' : 'heart'} size={26} fill={liked} />
          </div>
          <span className="reel-action-count">{likeCount > 0 ? likeCount : ''}</span>
        </button>

        {/* Comment */}
        <button
          id={`btn-reel-comment-${reel.id}`}
          className="reel-action-btn"
          onClick={e => { e.stopPropagation(); navigate(`/post/${reel.id}`) }}
          aria-label="Comments"
        >
          <div className="reel-action-icon">
            <Icon name="comment" size={26} />
          </div>
          <span className="reel-action-count">{reel.commentCount > 0 ? reel.commentCount : ''}</span>
        </button>

        {/* Share */}
        <button
          id={`btn-reel-share-${reel.id}`}
          className="reel-action-btn"
          onClick={async e => {
            e.stopPropagation()
            if (navigator.share) {
              await navigator.share({ url: `${location.origin}/post/${reel.id}` })
            } else {
              await navigator.clipboard.writeText(`${location.origin}/post/${reel.id}`)
              toast.success('Link copied!')
            }
          }}
          aria-label="Share"
        >
          <div className="reel-action-icon">
            <Icon name="share" size={24} />
          </div>
          <span className="reel-action-count">Share</span>
        </button>

        {/* Score chip — algo debug in development */}
        {import.meta.env.DEV && reel.score != null && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 4 }}>
            {reel.score?.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}
