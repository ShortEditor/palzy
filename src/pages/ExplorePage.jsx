import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getUserProfile } from '../firebase/users'
import { batchCheckLikes } from '../firebase/posts'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import Avatar from '../components/Avatar'
import VerifiedBadge from '../components/VerifiedBadge'
import LeaderboardCard from '../components/LeaderboardCard'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import FollowButton from '../components/FollowButton'
import { getRecommendations } from '../firebase/follows'

const TABS = ['Explore', 'Leaderboard']

export default function ExplorePage() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab]   = useState('Explore')
  const [query_, setQuery_]         = useState('')
  const [results, setResults]       = useState([])
  const [posts, setPosts]           = useState([])
  const [likeMap, setLikeMap]       = useState({})
  const [authorMap, setAuthorMap]   = useState({})
  const [searching, setSearching]   = useState(false)
  const [searched, setSearched]     = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    getRecommendations(currentUser.uid, 8)
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setLoadingSuggestions(false))
  }, [currentUser])

  function handleFollowed(uid) {
    setSuggestions(prev => prev.filter(u => u.uid !== uid))
  }

  async function handleSearch(e) {
    e.preventDefault()
    const q = query_.trim().toLowerCase()
    if (!q) return
    setSearching(true); setSearched(false)
    try {
      const usersSnap = await getDocs(query(
        collection(db, 'users'),
        where('username', '>=', q),
        where('username', '<=', q + '\uf8ff'),
        limit(10),
      ))
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))

      const postsSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30)))
      const allPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const matchedPosts = allPosts.filter(p => p.content?.toLowerCase().includes(q))

      const missingUids = [...new Set(matchedPosts.map(p => p.authorId))].filter(uid => !authorMap[uid])
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newMap = {}
      profiles.forEach((p, i) => { if (p) newMap[missingUids[i]] = p })

      const newLikeMap = await batchCheckLikes(matchedPosts.map(p => p.id), currentUser.uid)

      setResults(users); setPosts(matchedPosts)
      setAuthorMap(prev => ({ ...prev, ...newMap }))
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false); setSearched(true)
    }
  }

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
        <h1>Explore</h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--space-3)' }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'Explore' && '🔍 '}
            {tab === 'Leaderboard' && '🏆 '}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Explore' && (
        <>
          <form onSubmit={handleSearch} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Icon name="search" size={18} />
              </span>
              <input
                id="explore-search"
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '6rem' }}
                placeholder="Search people or posts…"
                value={query_}
                onChange={e => setQuery_(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!query_.trim() || searching}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                {searching ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Search'}
              </button>
            </div>
          </form>

          {!searched ? (
            loadingSuggestions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><div className="spinner" /></div>
            ) : suggestions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Icon name="search" size={40} /></div>
                <div className="empty-state-title">Find your batchmates</div>
                <div className="empty-state-body">Search by username or keyword to find posts and people.</div>
              </div>
            ) : (
              <div>
                <div style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--font-size-base)', fontWeight: 700, fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="users" size={18} /> People you may know
                </div>
                {suggestions.map(user => (
                  <div key={user.uid} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--dur-fast)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <Link to={`/u/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <Avatar src={user.photoURL} name={user.name} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }} className="font-semibold text-sm">
                          {user.name}{user.isVerified && <VerifiedBadge size={13} />}
                        </div>
                        <div className="text-xs text-muted" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 6px' }}>
                          <span>@{user.username}</span>
                          {[user.branch && user.showBranch !== false ? user.branch : null, user.year && user.showYear !== false ? user.year : null].filter(Boolean).length > 0 && <span>·</span>}
                          <span>{[user.branch && user.showBranch !== false ? user.branch : null, user.year && user.showYear !== false ? user.year : null].filter(Boolean).join(' ')}</span>
                        </div>
                        {user.mutualCount > 0 && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--brand-accent)', marginTop: 4 }}>
                            {user.mutualCount} mutual{user.mutualCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </Link>
                    <FollowButton targetUid={user.uid} onToggle={(followed) => { if (followed) handleFollowed(user.uid) }} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {results.length > 0 && (
                <div>
                  <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>People</div>
                  {results.map(user => (
                    <Link key={user.uid} to={`/u/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                      <Avatar src={user.photoURL} name={user.name} size="md" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }} className="font-semibold text-sm">
                          {user.name}{user.isVerified && <VerifiedBadge size={13} />}
                        </div>
                        <div className="text-xs text-muted">@{user.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {posts.length > 0 && (
                <div>
                  <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>Posts</div>
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} authorProfile={authorMap[post.authorId]} isLiked={likeMap[post.id] ?? false} />
                  ))}
                </div>
              )}
              {results.length === 0 && posts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Icon name="info" size={36} /></div>
                  <div className="empty-state-title">No results</div>
                  <div className="empty-state-body">Try a different search term.</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'Leaderboard' && (
        <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Top 5 posters from your class this week. Resets every Monday.
          </div>
          <LeaderboardCard />
        </div>
      )}
    </div>
  )
}
