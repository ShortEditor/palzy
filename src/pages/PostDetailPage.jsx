import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { getPost, isLikedByUser, toggleLike, addCommentToPost, getComments } from '../firebase/posts'
import { getUserProfile } from '../firebase/users'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

export default function PostDetailPage() {
  const { postId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [post, setPost]             = useState(null)
  const [author, setAuthor]         = useState(null)
  const [liked, setLiked]           = useState(false)
  const [likeCount, setLikeCount]   = useState(0)
  const [comments, setComments]     = useState([])
  const [commentAuthors, setCommentAuthors] = useState({})
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [p, liked] = await Promise.all([
          getPost(postId),
          isLikedByUser(postId, currentUser.uid),
        ])
        if (!p) { navigate('/'); return }
        setPost(p)
        setLiked(liked)
        setLikeCount(p.likeCount ?? 0)

        const [authorProfile, postComments] = await Promise.all([
          getUserProfile(p.authorId),
          getComments(postId),
        ])
        setAuthor(authorProfile)
        setComments(postComments)

        // Load comment authors
        const missingUids = [...new Set(postComments.map(c => c.authorId))]
        const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
        const map = {}
        profiles.forEach((p, i) => { if (p) map[missingUids[i]] = p })
        setCommentAuthors(map)
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
    try {
      await toggleLike(postId, currentUser.uid)
    } catch {
      setLiked(prev => !prev)
      setLikeCount(prev => liked ? prev + 1 : prev - 1)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await addCommentToPost(postId, { authorId: currentUser.uid, text: commentText })
      setCommentText('')
      // Reload comments
      const updated = await getComments(postId)
      setComments(updated)
      // Ensure current user's profile is in the map
      if (!commentAuthors[currentUser.uid]) {
        const p = await getUserProfile(currentUser.uid)
        if (p) setCommentAuthors(prev => ({ ...prev, [currentUser.uid]: p }))
      }
    } catch (err) {
      toast.error('Could not add comment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="feed-column" style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  )
  if (!post) return null

  const postTime = post.createdAt?.toDate?.()
  const handle   = author?.username ?? '...'

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
        {/* Author row */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <Avatar src={author?.photoURL} name={author?.name} size="lg" />
          <div>
            <div className="font-semibold">{author?.name}</div>
            <div className="text-sm text-muted">@{handle}</div>
          </div>
        </div>

        {/* Text */}
        {post.content && (
          <p style={{ fontSize: 'var(--font-size-xl)', lineHeight: 1.6, marginBottom: 'var(--space-4)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {post.content}
          </p>
        )}

        {/* Image */}
        {post.imageURL && (
          <div className="post-image" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <img src={post.imageURL} alt="Post image" />
          </div>
        )}

        {/* Timestamp */}
        <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          {postTime?.toLocaleString() ?? 'just now'}
        </div>

        <div className="divider" />

        {/* Actions */}
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
            <span style={{ fontSize: 'var(--font-size-base)' }}>{comments.length}</span>
          </div>
        </div>

        <div className="divider" />
      </div>

      {/* Add comment */}
      <form
        onSubmit={handleComment}
        style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-3)' }}
      >
        <Avatar src={commentAuthors[currentUser.uid]?.photoURL} name={commentAuthors[currentUser.uid]?.name ?? 'You'} size="md" />
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

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-body">No replies yet — be the first!</div>
        </div>
      ) : (
        comments.map(comment => {
          const cAuthor = commentAuthors[comment.authorId]
          const cTime   = comment.createdAt?.toDate?.()
          return (
            <div key={comment.id} className="comment-item">
              <Avatar src={cAuthor?.photoURL} name={cAuthor?.name} size="sm" />
              <div className="comment-body">
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <span className="font-semibold text-sm">{cAuthor?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-muted">@{cAuthor?.username ?? '...'}</span>
                  {cTime && <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{formatDistanceToNow(cTime, { addSuffix: true })}</span>}
                </div>
                <p className="comment-text">{comment.text}</p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
