import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { getPost, isLikedByUser, toggleLike, addCommentToPost, getComments, deleteComment } from '../firebase/posts'
import { getUserProfile } from '../firebase/users'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import VerifiedBadge from '../components/VerifiedBadge'
import RichText from '../components/RichText'
import toast from 'react-hot-toast'

// ── Single comment / reply row ────────────────────────────────
function CommentRow({ comment, postId, currentUser, isAdmin, onDelete, onReply, depth = 0 }) {
  const name      = comment.authorName     || 'Unknown'
  const username  = comment.authorUsername || '...'
  const photoURL  = comment.authorPhotoURL || ''
  const verified  = comment.authorIsVerified ?? false
  const time      = comment.createdAt?.toDate?.()
  const isOwner   = currentUser?.uid === comment.authorId
  const canDelete = isOwner || isAdmin

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      padding: `var(--space-3) var(--space-5) var(--space-3) ${depth > 0 ? 'calc(var(--space-5) + 36px)' : 'var(--space-5)'}`,
      borderBottom: '1px solid var(--border-subtle)',
      position: 'relative',
    }}>
      {/* Thread line for replies */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 'calc(var(--space-5) + 16px)',
          top: 0, bottom: 0, width: 2,
          background: 'var(--border-subtle)',
          borderRadius: 99,
        }} />
      )}

      <Link to={`/u/${username}`} style={{ flexShrink: 0 }}>
        <Avatar src={photoURL} name={name} size="sm" />
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Link to={`/u/${username}`} style={{ display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</span>
            {verified && <VerifiedBadge size={12} />}
          </Link>
          <span className="text-xs text-muted">@{username}</span>
          {time && (
            <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
              {formatDistanceToNow(time, { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Text */}
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)',
          marginTop: 'var(--space-1)', lineHeight: 1.55,
        }}>
          {comment.text}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', alignItems: 'center' }}>
          <button
            onClick={() => onReply(comment)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Icon name="comment" size={12} /> Reply
          </button>

          {canDelete && (
            <button
              onClick={() => onDelete(comment)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                fontFamily: 'var(--font-sans)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Icon name="trash" size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inline reply form ─────────────────────────────────────────
function ReplyForm({ replyingTo, currentUser, userProfile, onSubmit, onCancel, submitting }) {
  const [text, setText] = useState(`@${replyingTo.authorUsername} `)

  return (
    <div style={{
      display: 'flex', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-5) var(--space-3) calc(var(--space-5) + 36px)',
      background: 'rgba(160,120,255,0.04)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <Avatar src={userProfile?.photoURL} name={userProfile?.name ?? 'You'} size="sm" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <textarea
          autoFocus
          className="create-post-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={`Reply to @${replyingTo.authorUsername}…`}
          style={{ minHeight: 60, fontSize: 'var(--font-size-sm)' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onSubmit(text, replyingTo)}
            disabled={!text.trim() || submitting}
          >
            {submitting ? <div className="spinner" style={{ width:12, height:12, borderWidth:2 }} /> : <><Icon name="send" size={12} /> Reply</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PostDetailPage() {
  const { postId }  = useParams()
  const { currentUser, userProfile } = useAuth()
  const navigate    = useNavigate()
  const isAdmin     = userProfile?.isAdmin ?? false

  const [post, setPost]             = useState(null)
  const [author, setAuthor]         = useState(null)
  const [liked, setLiked]           = useState(false)
  const [likeCount, setLikeCount]   = useState(0)
  const [comments, setComments]     = useState([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)  // comment object being replied to

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [p, liked_] = await Promise.all([
          getPost(postId),
          isLikedByUser(postId, currentUser.uid),
        ])
        if (!p) { navigate('/'); return }
        setPost(p)
        setLiked(liked_)
        setLikeCount(p.likeCount ?? 0)

        const [authorProfile, postComments] = await Promise.all([
          getUserProfile(p.authorId),
          getComments(postId),
        ])
        setAuthor(authorProfile)
        setComments(postComments)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId, currentUser.uid, navigate])

  async function handleLike() {
    setLiked(prev => !prev)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
    try { await toggleLike(postId, currentUser.uid) }
    catch { setLiked(prev => !prev); setLikeCount(prev => liked ? prev + 1 : prev - 1) }
  }

  async function handleTopLevelComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const newComment = await addCommentToPost(postId, { authorId: currentUser.uid, text: commentText, parentId: null })
      setCommentText('')
      setComments(prev => [...prev, newComment])
    } catch { toast.error('Could not add comment.') }
    finally { setSubmitting(false) }
  }

  async function handleReplySubmit(text, parentComment) {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      // Reply's parentId = the top-level comment's id (flatten threads to 2 levels)
      const parentId = parentComment.parentId ?? parentComment.id
      const newReply = await addCommentToPost(postId, { authorId: currentUser.uid, text, parentId })
      setComments(prev => [...prev, newReply])
      setReplyingTo(null)
    } catch { toast.error('Could not post reply.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(comment) {
    try {
      const deleted = await deleteComment(postId, comment.id)
      // Remove deleted comment and its replies from UI
      setComments(prev => prev.filter(c => c.id !== comment.id && c.parentId !== comment.id))
      setPost(p => p ? { ...p, commentCount: Math.max(0, (p.commentCount ?? 0) - deleted) } : p)
      toast.success('Deleted')
    } catch (err) {
      console.error(err)
      toast.error('Could not delete.')
    }
  }

  if (loading) return (
    <div className="feed-column" style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  )
  if (!post) return null

  // Group: top-level comments + replies map
  const topLevel = comments.filter(c => !c.parentId)
  const replyMap = {}
  comments.forEach(c => {
    if (c.parentId) {
      if (!replyMap[c.parentId]) replyMap[c.parentId] = []
      replyMap[c.parentId].push(c)
    }
  })

  const postTime   = post.createdAt?.toDate?.()
  const displayName = post.authorName || author?.name || 'Unknown'
  const handle      = post.authorUsername || author?.username || '...'
  const photoURL    = post.authorPhotoURL || author?.photoURL || ''
  const isVerified  = post.authorIsVerified !== undefined ? post.authorIsVerified : (author?.isVerified ?? false)

  return (
    <div className="feed-column">
      {/* Back header */}
      <div className="page-header">
        <button id="btn-back" className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1>Post</h1>
      </div>

      {/* Post content */}
      <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <Avatar src={photoURL} name={displayName} size="lg" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              {displayName}{isVerified && <VerifiedBadge size={16} />}
            </div>
            <div className="text-sm text-muted">@{handle}</div>
          </div>
        </div>

        {post.content && (
          <RichText
            text={post.content}
            style={{ fontSize: 'var(--font-size-xl)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}
          />
        )}

        {post.imageURL && (
          <div className="post-image" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <img src={post.imageURL} alt="Post image" />
          </div>
        )}

        <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          {postTime?.toLocaleString() ?? 'just now'}
        </div>

        <div className="divider" />

        <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3) 0' }}>
          <button
            id="btn-like-detail"
            className={`post-action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
            aria-pressed={liked}
          >
            <Icon name={liked ? 'heartFilled' : 'heart'} size={20} fill={liked} />
            <span style={{ fontSize: 'var(--font-size-base)' }}>{likeCount}</span>
          </button>
          <div className="post-action-btn" style={{ cursor: 'default' }}>
            <Icon name="comment" size={20} />
            <span style={{ fontSize: 'var(--font-size-base)' }}>{post.commentCount ?? comments.length}</span>
          </div>
        </div>

        <div className="divider" />
      </div>

      {/* Top-level comment input */}
      <form
        onSubmit={handleTopLevelComment}
        style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-3)' }}
      >
        <Avatar src={userProfile?.photoURL} name={userProfile?.name ?? 'You'} size="md" />
        <div style={{ flex: 1, display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input
            id="comment-input"
            className="form-input"
            placeholder="Write a reply…"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            maxLength={500}
          />
          <button
            id="btn-submit-comment"
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!commentText.trim() || submitting}
            aria-label="Submit comment"
          >
            {submitting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Icon name="send" size={14} />}
          </button>
        </div>
      </form>

      {/* Threaded comments */}
      {topLevel.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-body">No replies yet — be the first!</div>
        </div>
      ) : (
        topLevel.map(comment => (
          <div key={comment.id}>
            {/* Top-level comment */}
            <CommentRow
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onReply={c => setReplyingTo(c)}
              depth={0}
            />

            {/* Replies to this comment */}
            {(replyMap[comment.id] ?? []).map(reply => (
              <div key={reply.id}>
                <CommentRow
                  comment={reply}
                  postId={postId}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                  onReply={c => setReplyingTo(c)}
                  depth={1}
                />
                {/* Inline reply form if replying to this reply */}
                {replyingTo?.id === reply.id && (
                  <ReplyForm
                    replyingTo={reply}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    onSubmit={handleReplySubmit}
                    onCancel={() => setReplyingTo(null)}
                    submitting={submitting}
                  />
                )}
              </div>
            ))}

            {/* Inline reply form if replying to this top-level comment */}
            {replyingTo?.id === comment.id && (
              <ReplyForm
                replyingTo={comment}
                currentUser={currentUser}
                userProfile={userProfile}
                onSubmit={handleReplySubmit}
                onCancel={() => setReplyingTo(null)}
                submitting={submitting}
              />
            )}
          </div>
        ))
      )}
    </div>
  )
}
