import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFeedPosts, batchCheckLikes } from '../firebase/posts'
import { getUserProfile } from '../firebase/users'
import { getFollowingIds } from '../firebase/follows'
import CreatePost from '../components/CreatePost'
import PostCard from '../components/PostCard'
import Icon from '../components/Icon'

const SKELETON_COUNT = 5

function PostSkeleton() {
  return (
    <div style={{
      margin: 'var(--space-4) var(--space-4) var(--space-5)',
      padding: 'var(--space-5)',
      borderRadius: 'var(--radius-post)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-clay)',
      display: 'flex', gap: 'var(--space-3)',
    }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 140, width: '100%', borderRadius: 20, marginTop: 8 }} />
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { currentUser } = useAuth()

  const [posts, setPosts]               = useState([])
  const [authorMap, setAuthorMap]       = useState({})   // uid → profile
  const [likeMap, setLikeMap]           = useState({})   // postId → boolean
  const [followingIds, setFollowingIds] = useState([])   // uids this user follows
  const [cursor, setCursor]             = useState(null)
  const [hasMore, setHasMore]           = useState(true)
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)

  const loaderRef = useRef(null)
  const authorMapRef = useRef(authorMap)
  const followingIdsRef = useRef(followingIds)

  // Keep refs in sync
  useEffect(() => { authorMapRef.current = authorMap }, [authorMap])
  useEffect(() => { followingIdsRef.current = followingIds }, [followingIds])

  // Load following list once on mount
  useEffect(() => {
    if (!currentUser?.uid) return
    getFollowingIds(currentUser.uid).then(ids => setFollowingIds(ids)).catch(() => {})
  }, [currentUser?.uid])

  // ─── Fetch a page of posts ──────────────────────────────────
  const fetchPosts = useCallback(async (cur = null) => {
    if (cur === null) setLoading(true); else setLoadingMore(true)
    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await getFeedPosts(
        cur,
        currentUser.uid,
        followingIdsRef.current,
      )

      // Fetch any authors we haven't loaded yet (legacy posts without denormalized data)
      const missingUids = [...new Set(newPosts.map(p => p.authorId))].filter(uid => !authorMapRef.current[uid])
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newAuthorMap = {}
      profiles.forEach((p, i) => { if (p) newAuthorMap[missingUids[i]] = p })

      // Batch check likes
      const newLikeMap = await batchCheckLikes(newPosts.map(p => p.id), currentUser.uid)

      setAuthorMap(prev => ({ ...prev, ...newAuthorMap }))
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
      setPosts(prev => cur ? [...prev, ...newPosts] : newPosts)
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentUser.uid])

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

  // Called after creating a new post — prepend it locally to feed
  function handlePostCreated(newPost) {
    if (newPost) {
      setPosts(prev => [newPost, ...prev])
    } else {
      // Fallback
      setPosts([])
      setCursor(null)
      setHasMore(true)
      fetchPosts(null)
    }
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
          <div className="empty-state-icon"><Icon name="sparkles" size={40} /></div>
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
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', padding: 'var(--space-4)', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-6)' }}>
                  <Icon name="leaf" size={14} /> You've seen everything — go touch some grass
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
