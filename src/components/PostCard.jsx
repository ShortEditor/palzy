import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike, deletePost } from '../firebase/posts'
import Avatar from './Avatar'
import Icon from './Icon'
import toast from 'react-hot-toast'

export default function PostCard({ post, authorProfile, isLiked: initialLiked = false, onDelete }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [liked, setLiked]         = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0)
  const [liking, setLiking]       = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const isOwner = currentUser?.uid === post.authorId

  const createdAt = post.createdAt?.toDate?.()
  const timeAgo   = createdAt
    ? formatDistanceToNow(createdAt, { addSuffix: true })
    : 'just now'

  async function handleLike(e) {
    e.stopPropagation()
    if (liking) return
    setLiking(true)
    // Optimistic update
    setLiked(prev => !prev)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
    try {
      await toggleLike(post.id, currentUser.uid)
    } catch {
      // Revert on error
      setLiked(prev => !prev)
      setLikeCount(prev => liked ? prev + 1 : prev - 1)
      toast.error('Could not update like.')
    } finally {
      setLiking(false)
    }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    if (!window.confirm('Delete this post?')) return
    setDeleting(true)
    try {
      await deletePost(post.id)
      toast.success('Post deleted.')
      onDelete?.(post.id)
    } catch {
      toast.error('Could not delete post.')
      setDeleting(false)
    }
  }

  function goToPost(e) {
    navigate(`/post/${post.id}`)
  }

  const displayName = authorProfile?.name     ?? 'Unknown'
  const handle      = authorProfile?.username  ?? '...'
  const photoURL    = authorProfile?.photoURL  ?? ''

  return (
    <article
      className="post-card animate-fade-in"
      onClick={goToPost}
      tabIndex={0}
      role="article"
      onKeyDown={e => { if (e.key === 'Enter') goToPost() }}
      aria-label={`Post by @${handle}`}
    >
      {/* Avatar */}
      <Link
        to={`/u/${handle}`}
        onClick={e => e.stopPropagation()}
        aria-label={`View @${handle}'s profile`}
      >
        <Avatar src={photoURL} name={displayName} size="md" />
      </Link>

      <div className="post-card-body">
        {/* Meta row */}
        <div className="post-meta">
          <Link
            to={`/u/${handle}`}
            onClick={e => e.stopPropagation()}
            className="post-author-name"
            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
          >
            {displayName}
          </Link>
          <span className="post-author-handle">@{handle}</span>
          <span className="post-timestamp" title={createdAt?.toLocaleString()}>{timeAgo}</span>
        </div>

        {/* Post text */}
        {post.content && <p className="post-text">{post.content}</p>}

        {/* Post image */}
        {post.imageURL && (
          <div className="post-image">
            <img src={post.imageURL} alt="Post image" loading="lazy" />
          </div>
        )}

        {/* Action bar */}
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          {/* Like */}
          <button
            id={`btn-like-${post.id}`}
            className={`post-action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={liking}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            aria-pressed={liked}
          >
            <Icon name={liked ? 'heartFilled' : 'heart'} size={18} fill={liked} />
            <span>{likeCount > 0 ? likeCount : ''}</span>
          </button>

          {/* Comments */}
          <button
            id={`btn-comment-${post.id}`}
            className="post-action-btn"
            onClick={() => navigate(`/post/${post.id}`)}
            aria-label="View comments"
          >
            <Icon name="comment" size={18} />
            <span>{post.commentCount > 0 ? post.commentCount : ''}</span>
          </button>

          {/* Delete (own posts) */}
          {isOwner && (
            <button
              id={`btn-delete-${post.id}`}
              className="post-action-btn"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete post"
              style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
            >
              {deleting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Icon name="trash" size={16} />}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
