import { useState } from 'react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getUserProfile } from '../firebase/users'
import { batchCheckLikes } from '../firebase/posts'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import Avatar from '../components/Avatar'
import VerifiedBadge from '../components/VerifiedBadge'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

export default function ExplorePage() {
  const { currentUser } = useAuth()
  const [query_, setQuery_] = useState('')
  const [results, setResults] = useState([])  // user results
  const [posts, setPosts]     = useState([])
  const [likeMap, setLikeMap] = useState({})
  const [authorMap, setAuthorMap] = useState({})
  const [searching, setSearching] = useState(false)
  const [searched, setSearched]   = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    const q = query_.trim().toLowerCase()
    if (!q) return

    setSearching(true)
    setSearched(false)

    try {
      // Search users by username prefix
      const usersSnap = await getDocs(
        query(
          collection(db, 'users'),
          where('username', '>=', q),
          where('username', '<=', q + '\uf8ff'),
          limit(10),
        )
      )
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))

      // Search posts containing query text (simple: just latest posts)
      const postsSnap = await getDocs(
        query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
      )
      const allPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const matchedPosts = allPosts.filter(p => p.content?.toLowerCase().includes(q))

      // Load authors for posts
      const missingUids = [...new Set(matchedPosts.map(p => p.authorId))].filter(uid => !authorMap[uid])
      const profiles = await Promise.all(missingUids.map(uid => getUserProfile(uid)))
      const newMap = {}
      profiles.forEach((p, i) => { if (p) newMap[missingUids[i]] = p })

      const newLikeMap = await batchCheckLikes(matchedPosts.map(p => p.id), currentUser.uid)

      setResults(users)
      setPosts(matchedPosts)
      setAuthorMap(prev => ({ ...prev, ...newMap }))
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }

  return (
    <div className="feed-column">
      <div className="page-header">
        <h1>Explore</h1>
      </div>

      {/* Search bar */}
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

      {/* Results */}
      {!searched ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Find your batchmates</div>
          <div className="empty-state-body">Search by username or keyword to find posts and people.</div>
        </div>
      ) : (
        <>
          {/* People */}
          {results.length > 0 && (
            <div>
              <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>People</div>
              {results.map(user => (
                <Link key={user.uid} to={`/u/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none', transition: 'background var(--dur-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <Avatar src={user.photoURL} name={user.name} size="md" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }} className="font-semibold text-sm">
                      {user.name}
                      {user.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <div className="text-xs text-muted">@{user.username} · {user.branch} {user.year}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <div>
              <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>Posts</div>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  authorProfile={authorMap[post.authorId]}
                  isLiked={likeMap[post.id] ?? false}
                />
              ))}
            </div>
          )}

          {results.length === 0 && posts.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">😶</div>
              <div className="empty-state-title">No results</div>
              <div className="empty-state-body">Try a different search term.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
