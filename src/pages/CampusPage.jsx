import { useState, useEffect, useCallback, useRef } from 'react'
import { getDoubtPosts } from '../firebase/doubts'
import { getNotesPosts, getHotPosts } from '../firebase/campus'
import { getUserProfile } from '../firebase/users'
import { batchCheckLikes } from '../firebase/posts'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import Icon from '../components/Icon'

const TABS = ['Doubts', 'Notes', 'Hot This Week']
const BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT']
const YEARS    = ['1st Year', '2nd Year', '3rd Year', '4th Year']

// ── Campus Board Filterable Section ────────────────────────────
function CampusBoardSection({ currentUser, userProfile, fetchFunction, emptyTitle, emptyBody, emptyIcon }) {
  const [posts, setPosts]       = useState([])
  const [likeMap, setLikeMap]   = useState({})
  const [authorMap, setAuthorMap] = useState({})
  const [cursor, setCursor]     = useState(null)
  const [hasMore, setHasMore]   = useState(true)
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [branch, setBranch]     = useState(userProfile?.branch || '')
  const [year, setYear]         = useState(userProfile?.year || '')
  const loaderRef               = useRef(null)
  const seenIds                 = useRef(new Set())

  const fetchData = useCallback(async (cur = null, br = branch, yr = year) => {
    if (cur === null) {
      setLoading(true)
      seenIds.current = new Set()
    } else {
      setLoadingMore(true)
    }

    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await fetchFunction(cur, br || null, yr || null)
      const fresh = newPosts.filter(p => !seenIds.current.has(p.id))
      fresh.forEach(p => seenIds.current.add(p.id))

      const missingUids = [...new Set(fresh.map(p => p.authorId))]
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newAuthorMap = {}
      profiles.forEach((p, i) => { if (p) newAuthorMap[missingUids[i]] = p })

      const newLikeMap = await batchCheckLikes(fresh.map(p => p.id), currentUser.uid)

      setAuthorMap(prev => ({ ...prev, ...newAuthorMap }))
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
      setPosts(prev => cur ? [...prev, ...fresh] : fresh)
      setCursor(nextCursor)
      setHasMore(more && fresh.length > 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentUser?.uid, branch, year, fetchFunction])

  useEffect(() => {
    fetchData(null)
  }, [branch, year]) // Re-run fetch when filter pill is clicked

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchData(cursor)
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [cursor, hasMore, loadingMore, loading, fetchData])

  function applyFilter(br, yr) {
    setBranch(br)
    setYear(yr)
    setCursor(null)
    setPosts([])
    setHasMore(true)
  }

  return (
    <div>
      {/* Filter pills */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginRight: 4 }}>Filter:</span>
        {/* Branch pills */}
        {BRANCHES.map(b => (
          <button
            key={b}
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter(branch === b ? '' : b, year)}
            style={{
              borderRadius: 99, padding: '3px 12px', fontSize: 12,
              fontWeight: branch === b ? 700 : 400,
              background: branch === b ? 'var(--brand-primary-glow)' : 'transparent',
              color: branch === b ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
              border: branch === b ? '1px solid var(--brand-primary-cont)' : '1px solid var(--border-subtle)',
            }}
          >{b}</button>
        ))}
        <span style={{ color: 'var(--border-normal)' }}>·</span>
        {/* Year pills */}
        {YEARS.map(y => (
          <button
            key={y}
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter(branch, year === y ? '' : y)}
            style={{
              borderRadius: 99, padding: '3px 12px', fontSize: 12,
              fontWeight: year === y ? 700 : 400,
              background: year === y ? 'rgba(34,197,94,0.1)' : 'transparent',
              color: year === y ? 'var(--brand-green)' : 'var(--text-muted)',
              border: year === y ? '1px solid var(--brand-green)' : '1px solid var(--border-subtle)',
            }}
          >{y}</button>
        ))}
        {(branch || year) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter('', '')}
            style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 8px' }}
          >✕ Clear</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 'var(--space-10)' }}>
          <div className="empty-state-icon" style={{ fontSize: 36 }}>{emptyIcon}</div>
          <div className="empty-state-title">{emptyTitle}</div>
          <div className="empty-state-body">{emptyBody}</div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              authorProfile={authorMap[post.authorId]}
              isLiked={likeMap[post.id] ?? false}
            />
          ))}
          <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore && <div className="spinner" />}
            {!hasMore && posts.length > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>All caught up! 🎓</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── CampusPage ────────────────────────────────────────────────
export default function CampusPage() {
  const { currentUser, userProfile } = useAuth()
  const [activeTab, setActiveTab]   = useState('Doubts')
  const [hotPosts, setHotPosts]     = useState([])
  const [hotLikes, setHotLikes]     = useState({})
  const [hotAuthors, setHotAuthors] = useState({})
  const [loadingHot, setLoadingHot] = useState(false)

  const loadHot = useCallback(async () => {
    setLoadingHot(true)
    try {
      const trending = await getHotPosts(userProfile?.branch, userProfile?.year)
      const missingUids = [...new Set(trending.map(p => p.authorId))]
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const authorMap = {}
      profiles.forEach((p, i) => { if (p) authorMap[missingUids[i]] = p })

      const likeMap = await batchCheckLikes(trending.map(p => p.id), currentUser.uid)

      setHotAuthors(authorMap)
      setHotLikes(likeMap)
      setHotPosts(trending)
    } catch (err) {
      console.error('Error loading hot posts:', err)
    } finally {
      setLoadingHot(false)
    }
  }, [currentUser?.uid, userProfile?.branch, userProfile?.year])

  useEffect(() => {
    if (activeTab === 'Hot This Week') {
      loadHot()
    }
  }, [activeTab, loadHot])

  function tabStyle(tab) {
    const active = activeTab === tab
    return {
      flex: 1, padding: 'var(--space-3) var(--space-2)',
      fontWeight: active ? 700 : 500,
      fontSize: 'var(--font-size-sm)',
      color: active ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
      background: 'none', border: 'none',
      borderBottom: active ? '2px solid var(--brand-primary-cont)' : '2px solid transparent',
      cursor: 'pointer', transition: 'all 0.15s',
      fontFamily: 'var(--font-sans)',
    }
  }

  return (
    <div className="feed-column">
      <div className="page-header">
        <h1>Campus Board</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--space-3)' }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'Doubts' && '❓ '}
            {tab === 'Notes' && '📝 '}
            {tab === 'Hot This Week' && '🔥 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Doubts tab */}
      {activeTab === 'Doubts' && (
        <CampusBoardSection
          currentUser={currentUser}
          userProfile={userProfile}
          fetchFunction={getDoubtPosts}
          emptyTitle="No doubts yet"
          emptyBody="Have a query? Create a post and toggle Doubt so peers can help you out."
          emptyIcon="❓"
        />
      )}

      {/* Notes tab */}
      {activeTab === 'Notes' && (
        <CampusBoardSection
          currentUser={currentUser}
          userProfile={userProfile}
          fetchFunction={getNotesPosts}
          emptyTitle="No class notes yet"
          emptyBody="Share summaries, syllabus sheets, or resources. Make a post and toggle Note to add it here."
          emptyIcon="📝"
        />
      )}

      {/* Hot This Week tab */}
      {activeTab === 'Hot This Week' && (
        <div>
          <div style={{ padding: 'var(--space-4) var(--space-5) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Vibes heating up on campus right now (ranked by engagement).
          </div>
          {loadingHot ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : hotPosts.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 'var(--space-10)' }}>
              <div className="empty-state-icon" style={{ fontSize: 36 }}>🔥</div>
              <div className="empty-state-title">No trending vibes yet</div>
              <div className="empty-state-body">Interact with posts to heat things up!</div>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-4)' }}>
              {hotPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  authorProfile={hotAuthors[post.authorId]}
                  isLiked={hotLikes[post.id] ?? false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
