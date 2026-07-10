import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getReelsFeed, loadReelAuthors } from '../firebase/reels'
import { batchCheckLikes } from '../firebase/posts'
import ReelCard from '../components/ReelCard'
import Icon from '../components/Icon'

export default function ReelsPage() {
  const { currentUser } = useAuth()

  const [reels, setReels]         = useState([])
  const [authorMap, setAuthorMap] = useState({})
  const [likeMap, setLikeMap]     = useState({})
  const [cursor, setCursor]       = useState(null)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Track seen IDs to avoid duplicates across pages
  const seenIds = useRef(new Set())
  // Ref on the sentinel div at the bottom of the list
  const sentinelRef = useRef(null)
  // IntersectionObserver ref
  const observerRef = useRef(null)

  // ── Fetch a batch of 5 reels ──────────────────────────────
  const fetchReels = useCallback(async (cur) => {
    if (cur === null) setLoading(true); else setLoadingMore(true)
    try {
      const { reels: newReels, nextCursor, hasMore: more } =
        await getReelsFeed(cur, seenIds.current)

      newReels.forEach(r => seenIds.current.add(r.id))

      const [authors, likes] = await Promise.all([
        loadReelAuthors(newReels, authorMap),
        batchCheckLikes(newReels.map(r => r.id), currentUser.uid),
      ])

      setAuthorMap(prev => ({ ...prev, ...authors }))
      setLikeMap(prev => ({ ...prev, ...likes }))
      setReels(prev => cur ? [...prev, ...newReels] : newReels)
      setCursor(nextCursor)
      setHasMore(more && newReels.length > 0)
    } catch (err) {
      console.error('Reels fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentUser.uid]) // eslint-disable-line

  // Initial load
  useEffect(() => {
    fetchReels(null)
  }, []) // eslint-disable-line

  // ── IntersectionObserver — triggers next 5 when sentinel visible ──
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchReels(cursor)
        }
      },
      {
        root: null,          // viewport
        rootMargin: '200px', // start loading 200px before sentinel is visible
        threshold: 0,
      }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [cursor, hasMore, loadingMore, loading, fetchReels])

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="reels-page">
        <div className="reels-container">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="reel-card reel-skeleton">
              <div className="skeleton" style={{ width: '100%', height: '100%' }} />
              <div className="reel-skeleton-info">
                <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: 240, height: 12, borderRadius: 8, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────
  if (!loading && reels.length === 0) {
    return (
      <div className="reels-page">
        <div className="empty-state" style={{ color: '#fff', margin: 'auto' }}>
          <div className="empty-state-icon">
            <Icon name="image" size={48} />
          </div>
          <div className="empty-state-title">No reels yet</div>
          <div className="empty-state-body">
            Post images to see them appear here as reels!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reels-page">
      {/* Header pill */}
      <div className="reels-header">
        <span className="reels-header-title">
          <Icon name="play" size={16} /> Reels
        </span>
      </div>

      {/* Snap-scroll container */}
      <div className="reels-container">
        {reels.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            authorProfile={authorMap[reel.authorId]}
            isLiked={likeMap[reel.id] ?? false}
          />
        ))}

        {/* Sentinel — IntersectionObserver watches this */}
        {hasMore && (
          <div ref={sentinelRef} className="reels-sentinel">
            {loadingMore && (
              <div className="reels-loading-more">
                <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                <span>Loading more reels…</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && reels.length > 0 && (
          <div className="reels-end">
            <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
            <div>You've seen it all!</div>
          </div>
        )}
      </div>
    </div>
  )
}
