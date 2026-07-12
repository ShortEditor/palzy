import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike, deletePost } from '../firebase/posts'
import { reportPost } from '../firebase/admin'
import { shareToStory, canNativeShare } from '../utils/shareUtils'
import Avatar from './Avatar'
import Icon from './Icon'
import VerifiedBadge from './VerifiedBadge'
import FollowButton from './FollowButton'
import toast from 'react-hot-toast'

export default function PostCard({ post, authorProfile, isLiked: initialLiked = false, onDelete }) {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  const [liked, setLiked]         = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0)
  const [liking, setLiking]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [sharing, setSharing]     = useState(false)
  const [reporting, setReporting] = useState(false)   // modal open
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

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

  async function handleReport(e) {
    e.stopPropagation()
    if (!reportReason) { toast.error('Pick a reason first.'); return }
    setSubmittingReport(true)
    try {
      const ok = await reportPost(post.id, currentUser.uid, reportReason)
      if (ok) toast.success('Report submitted. Thanks! 🚩')
      else    toast('You already reported this post.')
      setReporting(false)
      setReportReason('')
    } catch {
      toast.error('Could not submit report.')
    } finally {
      setSubmittingReport(false)
    }
  }

  async function handleShare(e) {
    e.stopPropagation()
    if (!post.imageURL || sharing) return
    setSharing(true)
    try {
      const result = await shareToStory(post.imageURL, post.content)
      if (result === 'shared') {
        toast.success('Shared! Select Instagram → Story 📲')
      } else if (result === 'downloaded') {
        toast.success(
          canNativeShare()
            ? 'Image saved! Open Instagram → + → Story'
            : 'Image downloaded! Open Instagram → + → Story',
          { duration: 5000 }
        )
      }
    } catch (err) {
      toast.error('Could not share image.')
    } finally {
      setSharing(false)
    }
  }

  // Owner-only: direct download of the image
  async function handleDownload(e) {
    e.stopPropagation()
    if (!post.imageURL || sharing) return
    setSharing(true)
    try {
      const resp = await fetch(post.imageURL)
      const blob = await resp.blob()
      const ext  = blob.type.includes('png') ? 'png' : 'jpg'
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `palzy-post-${post.id}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Image downloaded! ✓')
    } catch {
      toast.error('Could not download image.')
    } finally {
      setSharing(false)
    }
  }

  function goToPost(e) {
    navigate(`/post/${post.id}`)
  }

  const displayName = post.authorName || authorProfile?.name || 'Unknown'
  const handle      = post.authorUsername || authorProfile?.username || '...'
  const photoURL    = post.authorPhotoURL || authorProfile?.photoURL || ''
  const isVerified  = post.authorIsVerified !== undefined ? post.authorIsVerified : (authorProfile?.isVerified ?? false)

  return (
    <article
      className="post-card animate-fade-in"
      onClick={goToPost}
      tabIndex={0}
      role="article"
      onKeyDown={e => { if (e.key === 'Enter') goToPost() }}
      aria-label={`Post by @${handle}`}
    >
      {/* Avatar with gradient ring */}
      <Link
        to={`/u/${handle}`}
        onClick={e => e.stopPropagation()}
        aria-label={`View @${handle}'s profile`}
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        <div className="avatar-ring">
          <Avatar src={photoURL} name={displayName} size="md" />
        </div>
      </Link>

      <div className="post-card-body">
        {/* Meta row */}
        <div className="post-meta" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <Link
              to={`/u/${handle}`}
              onClick={e => e.stopPropagation()}
              className="post-author-name"
              style={{ color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)' }}
            >
              {displayName}
            </Link>
            {isVerified && <VerifiedBadge size={14} />}
          </div>
          <span className="post-author-handle">@{handle}</span>
          <span className="post-timestamp" title={createdAt?.toLocaleString()}>{timeAgo}</span>
          {/* Inline follow button — show for non-owner posts */}
          {!isOwner && (
            <span onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
              <FollowButton targetUid={post.authorId} size="sm" />
            </span>
          )}
        </div>

        {/* Post text */}
        {post.content && <p className="post-text">{post.content}</p>}

        {/* Post image */}
        {post.imageURL && (
          <div className="post-image">
            <img src={post.imageURL} alt="Post image" loading="lazy" />
          </div>
        )}

        {/* Quote Card badge */}
        {post.type === 'quote' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--font-size-xs)', color: 'var(--brand-primary-dim)',
            fontWeight: 600, marginTop: 'var(--space-1)',
          }}>
            <span style={{ fontSize: 11 }}>✦</span> Quote Card
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
            style={{ color: liked ? 'var(--brand-tertiary)' : undefined }}
          >
            <Icon name={liked ? 'heartFilled' : 'heart'} size={18} fill={liked} />
            <span>{likeCount > 0 ? likeCount : ''}</span>
          </button>

          {/* ⚡ First-to-react badge */}
          {post.firstLikerId && (
            <span
              title={`First like by @${post.firstLikerUsername ?? '?'}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700,
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 99,
                padding: '2px 7px',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              ⚡ first
            </span>
          )}

          {/* Comments */}
          <button
            id={`btn-comment-${post.id}`}
            className="post-action-btn"
            onClick={() => navigate(`/post/${post.id}`)}
            aria-label="View comments"
            style={{ '--hover-color': 'var(--brand-accent)' }}
          >
            <Icon name="comment" size={18} />
            <span>{post.commentCount > 0 ? post.commentCount : ''}</span>
          </button>

          {/* Share to Story — only visible to post owner */}
          {post.imageURL && isOwner && (
            <button
              id={`btn-share-${post.id}`}
              className="post-action-btn"
              onClick={handleShare}
              disabled={sharing}
              aria-label="Share to Instagram Story"
              title={canNativeShare() ? 'Share to Story' : 'Share for Story'}
            >
              {sharing
                ? <div className="spinner" style={{ width: 14, height: 14 }} />
                : <Icon name="share" size={18} />
              }
            </button>
          )}

          {/* Download — owner only */}
          {post.imageURL && isOwner && (
            <button
              id={`btn-download-${post.id}`}
              className="post-action-btn"
              onClick={handleDownload}
              disabled={sharing}
              aria-label="Download image"
              title="Download your image"
              style={{ color: 'var(--vibe-mint)' }}
            >
              {sharing
                ? <div className="spinner" style={{ width: 14, height: 14 }} />
                : <Icon name="download" size={18} />
              }
            </button>
          )}

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

          {/* Report (non-owner posts) */}
          {!isOwner && (
            <button
              id={`btn-report-${post.id}`}
              className="post-action-btn"
              onClick={e => { e.stopPropagation(); setReporting(true) }}
              aria-label="Report post"
              style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
              title="Report post"
            >
              <Icon name="flag" size={16} />
            </button>
          )}
        </div>

        {/* ── Report modal ────────────────────────────────── */}
        {reporting && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              marginTop: 'var(--space-3)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-normal)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              animation: 'fadeIn var(--dur-fast)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="flag" size={14} /> Report this post</div>
            <select
              id={`report-reason-${post.id}`}
              className="form-input"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              <option value="">Select a reason…</option>
              {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                id={`btn-submit-report-${post.id}`}
                className="btn btn-danger btn-sm"
                onClick={handleReport}
                disabled={submittingReport || !reportReason}
              >
                {submittingReport ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : 'Submit Report'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={e => { e.stopPropagation(); setReporting(false); setReportReason('') }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
