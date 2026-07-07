import { useState, useEffect, useCallback } from 'react'
import { getAdminPosts, adminDeletePost } from '../../firebase/admin'
import { getUserProfile } from '../../firebase/users'
import { formatDistanceToNow } from 'date-fns'
import Avatar from '../../components/Avatar'
import Icon from '../../components/Icon'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function AdminPosts() {
  const [posts, setPosts]         = useState([])
  const [authorMap, setAuthorMap] = useState({})
  const [cursor, setCursor]       = useState(null)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch]       = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  const fetchPosts = useCallback(async (cur = null) => {
    cur ? setLoadingMore(true) : setLoading(true)
    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await getAdminPosts(cur)

      // Load missing authors
      const missingUids = [...new Set(newPosts.map(p => p.authorId))].filter(uid => !authorMap[uid])
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newMap = {}
      profiles.forEach((p, i) => { if (p) newMap[missingUids[i]] = p })

      setAuthorMap(prev => ({ ...prev, ...newMap }))
      setPosts(prev => cur ? [...prev, ...newPosts] : newPosts)
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      toast.error('Failed to load posts.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [authorMap])

  useEffect(() => { fetchPosts() }, []) // eslint-disable-line

  async function handleDelete(postId) {
    if (!window.confirm('Delete this post permanently?')) return
    setDeletingId(postId)
    try {
      await adminDeletePost(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted.')
    } catch {
      toast.error('Could not delete post.')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = posts.filter(p =>
    !search || p.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Posts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {posts.length} loaded · newest first
          </p>
        </div>
        <input
          id="admin-post-search"
          className="form-input"
          style={{ width: 240 }}
          placeholder="Search post content…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Posts grid */}
      {loading ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '70%', height: 14, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-body">No posts found.</div></div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {filtered.map(post => {
            const author  = authorMap[post.authorId]
            const postedAt = post.createdAt?.toDate?.()
            return (
              <div
                key={post.id}
                className="card"
                style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}
              >
                <Avatar src={author?.photoURL} name={author?.name} size="md" />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Author row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{author?.name ?? 'Unknown'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>@{author?.username ?? '...'}</span>
                    {postedAt && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginLeft: 'auto' }}>{formatDistanceToNow(postedAt, { addSuffix: true })}</span>}
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: post.imageURL ? 'var(--space-3)' : 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {post.content.length > 200 ? post.content.slice(0, 200) + '…' : post.content}
                    </p>
                  )}

                  {/* Image thumbnail */}
                  {post.imageURL && (
                    <img src={post.imageURL} alt="post" style={{ marginTop: 'var(--space-2)', maxHeight: 120, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                  )}

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    <span>❤️ {post.likeCount ?? 0}</span>
                    <span>💬 {post.commentCount ?? 0}</span>
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {post.type === 'image' ? '📷 Image' : '✍️ Text'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    id={`admin-btn-view-${post.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/post/${post.id}`)}
                    title="View post"
                  >
                    <Icon name="arrow_left" size={14} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <button
                    id={`admin-btn-delete-${post.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    title="Delete post"
                  >
                    {deletingId === post.id
                      ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      : <Icon name="trash" size={14} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button className="btn btn-outline" onClick={() => fetchPosts(cursor)} disabled={loadingMore}>
            {loadingMore ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Loading…</> : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  )
}
