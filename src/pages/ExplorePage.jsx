import { useState, useEffect, useCallback, useRef } from "react"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { db } from "../firebase/config"
import { getUserProfile } from "../firebase/users"
import { batchCheckLikes } from "../firebase/posts"
import { getDoubtPosts } from "../firebase/doubts"
import { getWeeklyLeaderboard } from "../firebase/leaderboard"
import { useAuth } from "../contexts/AuthContext"
import PostCard from "../components/PostCard"
import Avatar from "../components/Avatar"
import VerifiedBadge from "../components/VerifiedBadge"
import LeaderboardCard from "../components/LeaderboardCard"
import { Link } from "react-router-dom"
import Icon from "../components/Icon"
import FollowButton from "../components/FollowButton"
import { getRecommendations } from "../firebase/follows"
import toast from "react-hot-toast"

const TABS = ["Explore", "Doubt Board", "Leaderboard"]
const BRANCHES = ["CSE", "ECE", "ME", "CE", "EE", "IT"]
const YEARS    = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

// ── Doubt Board sub-component ─────────────────────────────────
function DoubtBoard({ currentUser, userProfile }) {
  const [posts, setPosts]       = useState([])
  const [likeMap, setLikeMap]   = useState({})
  const [authorMap, setAuthorMap] = useState({})
  const [cursor, setCursor]     = useState(null)
  const [hasMore, setHasMore]   = useState(true)
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [branch, setBranch]     = useState(userProfile?.branch || "")
  const [year, setYear]         = useState(userProfile?.year || "")
  const loaderRef               = useRef(null)
  const seenIds                 = useRef(new Set())

  const fetchDoubts = useCallback(async (cur = null, br = branch, yr = year) => {
    if (cur === null) { setLoading(true); seenIds.current = new Set() }
    else setLoadingMore(true)
    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await getDoubtPosts(cur, br || null, yr || null)
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
  }, [currentUser?.uid, branch, year])

  useEffect(() => { fetchDoubts(null) }, [])

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loadingMore && !loading) fetchDoubts(cursor) },
      { threshold: 0.1 },
    )
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [cursor, hasMore, loadingMore, loading, fetchDoubts])

  function applyFilter(br, yr) {
    setBranch(br); setYear(yr)
    setCursor(null); setPosts([]); setHasMore(true)
    fetchDoubts(null, br, yr)
  }

  return (
    <div>
      {/* Filter pills */}
      <div style={{
        display: "flex", gap: "var(--space-2)", flexWrap: "wrap",
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--border-subtle)",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginRight: 4 }}>Filter:</span>
        {/* Branch pills */}
        {BRANCHES.map(b => (
          <button
            key={b}
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter(branch === b ? "" : b, year)}
            style={{
              borderRadius: 99, padding: "3px 12px", fontSize: 12,
              fontWeight: branch === b ? 700 : 400,
              background: branch === b ? "var(--brand-primary-glow)" : "transparent",
              color: branch === b ? "var(--brand-primary-cont)" : "var(--text-muted)",
              border: branch === b ? "1px solid var(--brand-primary-cont)" : "1px solid var(--border-subtle)",
            }}
          >{b}</button>
        ))}
        <span style={{ color: "var(--border-normal)" }}>·</span>
        {/* Year pills */}
        {YEARS.map(y => (
          <button
            key={y}
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter(branch, year === y ? "" : y)}
            style={{
              borderRadius: 99, padding: "3px 12px", fontSize: 12,
              fontWeight: year === y ? 700 : 400,
              background: year === y ? "rgba(34,197,94,0.1)" : "transparent",
              color: year === y ? "var(--brand-green)" : "var(--text-muted)",
              border: year === y ? "1px solid var(--brand-green)" : "1px solid var(--border-subtle)",
            }}
          >{y}</button>
        ))}
        {(branch || year) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => applyFilter("", "")}
            style={{ fontSize: 11, color: "var(--text-muted)", padding: "3px 8px" }}
          >✕ Clear</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-10)" }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "var(--space-10)" }}>
          <div className="empty-state-icon" style={{ fontSize: 36 }}>❓</div>
          <div className="empty-state-title">No doubts yet</div>
          <div className="empty-state-body">
            Post a question and tag it as a Doubt — your classmates can help!
          </div>
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
          <div ref={loaderRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loadingMore && <div className="spinner" />}
            {!hasMore && posts.length > 0 && (
              <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>All caught up! 🎓</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ExplorePage ──────────────────────────────────────────
export default function ExplorePage() {
  const { currentUser, userProfile } = useAuth()
  const [activeTab, setActiveTab]   = useState("Explore")
  const [query_, setQuery_]         = useState("")
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
        collection(db, "users"),
        where("username", ">=", q),
        where("username", "<=", q + "\uf8ff"),
        limit(10),
      ))
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))

      const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30)))
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

  // Tab bar style helper
  function tabStyle(tab) {
    const active = activeTab === tab
    return {
      flex: 1, padding: "var(--space-3) var(--space-2)",
      fontWeight: active ? 700 : 500,
      fontSize: "var(--font-size-sm)",
      color: active ? "var(--brand-primary-cont)" : "var(--text-muted)",
      background: "none", border: "none",
      borderBottom: active ? "2px solid var(--brand-primary-cont)" : "2px solid transparent",
      cursor: "pointer", transition: "all 0.15s",
      fontFamily: "var(--font-sans)",
    }
  }

  return (
    <div className="feed-column">
      <div className="page-header">
        <h1>Explore</h1>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", padding: "0 var(--space-3)" }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab === "Explore" && "🔍 "}
            {tab === "Doubt Board" && "❓ "}
            {tab === "Leaderboard" && "🏆 "}
            {tab}
          </button>
        ))}
      </div>

      {/* ── Explore tab ── */}
      {activeTab === "Explore" && (
        <>
          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                <Icon name="search" size={18} />
              </span>
              <input
                id="explore-search"
                className="form-input"
                style={{ paddingLeft: "2.5rem", paddingRight: "6rem" }}
                placeholder="Search people or posts…"
                value={query_}
                onChange={e => setQuery_(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!query_.trim() || searching}
                style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)" }}
              >
                {searching ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : "Search"}
              </button>
            </div>
          </form>

          {/* Results */}
          {!searched ? (
            loadingSuggestions ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}><div className="spinner" /></div>
            ) : suggestions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: "var(--text-muted)" }}><Icon name="search" size={40} /></div>
                <div className="empty-state-title">Find your batchmates</div>
                <div className="empty-state-body">Search by username or keyword to find posts and people.</div>
              </div>
            ) : (
              <div>
                <div style={{ padding: "var(--space-4) var(--space-5)", fontSize: "var(--font-size-base)", fontWeight: 700, fontFamily: "var(--font-display)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="users" size={18} /> People you may know
                </div>
                {suggestions.map(user => (
                  <div key={user.uid} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", transition: "background var(--dur-fast)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <Link to={`/u/${user.username}`} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0, textDecoration: "none" }}>
                      <Avatar src={user.photoURL} name={user.name} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-primary)" }} className="font-semibold text-sm">
                          {user.name}{user.isVerified && <VerifiedBadge size={13} />}
                        </div>
                        <div className="text-xs text-muted" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 6px" }}>
                          <span>@{user.username}</span>
                          {[user.branch && user.showBranch !== false ? user.branch : null, user.year && user.showYear !== false ? user.year : null].filter(Boolean).length > 0 && <span>·</span>}
                          <span>{[user.branch && user.showBranch !== false ? user.branch : null, user.year && user.showYear !== false ? user.year : null].filter(Boolean).join(" ")}</span>
                        </div>
                        {user.mutualCount > 0 && (
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--brand-accent)", marginTop: 4 }}>
                            {user.mutualCount} mutual{user.mutualCount !== 1 ? "s" : ""}
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
                  <div style={{ padding: "var(--space-3) var(--space-5)", fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>People</div>
                  {results.map(user => (
                    <Link key={user.uid} to={`/u/${user.username}`} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", textDecoration: "none" }}>
                      <Avatar src={user.photoURL} name={user.name} size="md" />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-primary)" }} className="font-semibold text-sm">
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
                  <div style={{ padding: "var(--space-3) var(--space-5)", fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>Posts</div>
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} authorProfile={authorMap[post.authorId]} isLiked={likeMap[post.id] ?? false} />
                  ))}
                </div>
              )}
              {results.length === 0 && posts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: "var(--text-muted)" }}><Icon name="info" size={36} /></div>
                  <div className="empty-state-title">No results</div>
                  <div className="empty-state-body">Try a different search term.</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Doubt Board tab ── */}
      {activeTab === "Doubt Board" && (
        <DoubtBoard currentUser={currentUser} userProfile={userProfile} />
      )}

      {/* ── Leaderboard tab ── */}
      {activeTab === "Leaderboard" && (
        <div style={{ padding: "var(--space-4) var(--space-5)" }}>
          <div style={{ marginBottom: "var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
            Top 5 posters from your class this week. Resets every Monday.
          </div>
          <LeaderboardCard />
        </div>
      )}
    </div>
  )
}
