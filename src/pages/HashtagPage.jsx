import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { batchCheckLikes } from '../firebase/posts'
import { batchGetEmojiReactions } from '../firebase/reactions'
import PostCard from '../components/PostCard'

export default function HashtagPage() {
  const { tag } = useParams()
  const { currentUser } = useAuth()
  const [posts, setPosts] = useState([])
  const [likedMap, setLikedMap] = useState({})
  const [reactionMap, setReactionMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    setPosts([])

    async function load() {
      try {
        const q = query(
          collection(db, 'posts'),
          where('hashtags', 'array-contains', tag.toLowerCase()),
          orderBy('createdAt', 'desc'),
          limit(30),
        )
        const snap = await getDocs(q)
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setPosts(loaded)

        if (currentUser && loaded.length > 0) {
          const ids = loaded.map(p => p.id)
          const [likes, reactions] = await Promise.all([
            batchCheckLikes(ids, currentUser.uid),
            batchGetEmojiReactions(ids, currentUser.uid),
          ])
          setLikedMap(likes)
          setReactionMap(reactions)
        }
      } catch (err) {
        console.error('HashtagPage load error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [tag, currentUser])

  return (
    <div className="page-container" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ padding: 'var(--space-4) 0 var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
          <span style={{ color: 'var(--brand-accent)' }}>#{tag}</span>
        </h1>
        {!loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 'var(--space-8)',
          color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>#️⃣</div>
          <p>No posts with <strong style={{ color: 'var(--brand-accent)' }}>#{tag}</strong> yet.</p>
          <p style={{ marginTop: 4 }}>Be the first to post with this hashtag!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            isLiked={likedMap[post.id] || false}
            userEmojiReaction={reactionMap[post.id] || null}
          />
        ))}
      </div>
    </div>
  )
}
