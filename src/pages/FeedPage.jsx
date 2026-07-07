import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFeedPosts, batchCheckLikes } from '../firebase/posts'
import { getUserProfile } from '../firebase/users'
import CreatePost from '../components/CreatePost'
import PostCard from '../components/PostCard'

const SKELETON_COUNT = 5

function PostSkeleton() {
  return (
    <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-3)' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 4 }} />
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { currentUser } = useAuth()

  const [posts, setPosts]           = useState([])
  const [authorMap, setAuthorMap]   = useState({})   // uid → profile
  const [likeMap, setLikeMap]       = useState({})   // postId → boolean
  const [cursor, setCursor]         = useState(null)
  const [hasMore, setHasMore]       = useState(true)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loaderRef = useRef(null)

  // ─── Fetch a page of posts ──────────────────────────────────
  const fetchPosts = useCallback(async (cur = null, prepend = false) => {
    if (cur === null) setLoading(true); else setLoadingMore(true)
    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await getFeedPosts(cur)

      // Fetch any authors we haven't loaded yet
      const missingUids = [...new Set(newPosts.map(p => p.authorId))].filter(uid => !authorMap[uid])
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newAuthorMap = {}
      profiles.forEach((p, i) => { if (p) newAuthorMap[missingUids[i]] = p })

      // Batch check likes
      const newLikeMap = await batchCheckLikes(newPosts.map(p => p.id), currentUser.uid)

      setAuthorMap(prev => ({ ...prev, ...newAuthorMap }))
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
      setPosts(prev => prepend ? [...newPosts, ...prev] : [...prev, ...newPosts])
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentUser.uid, authorMap])

  // Initial load
  useEffect(() => { fetchPosts(null) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore && !loading) fetchPosts(cursor) },
      { threshold: 0.1 },
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [cursor, hasMore, loadingMore, loading, fetchPosts])

  // Called after creating a new post — refresh feed from top
  function handlePostCreated() {
    setPosts([])
    setCursor(null)
    setHasMore(true)
    fetchPosts(null)
  }

  // Called when a post is deleted
  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="feed-column">
      {/* Page header */}
      <div className="page-header">
        <h1>Home</h1>
      </div>

      {/* Create post bar */}
      <CreatePost onPostCreated={handlePostCreated} />

      {/* Feed */}
      {loading ? (
        Array.from({ length: SKELETON_COUNT }, (_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌟</div>
          <div className="empty-state-title">Nothing here yet</div>
          <div className="empty-state-body">Be the first to post something — your batchmates are waiting!</div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              authorProfile={authorMap[post.authorId]}
              isLiked={likeMap[post.id] ?? false}
              onDelete={handlePostDeleted}
            />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore && <div className="spinner" />}
            {!hasMore && posts.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', padding: 'var(--space-4)' }}>
                You've seen everything — go touch some grass 🌿
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
