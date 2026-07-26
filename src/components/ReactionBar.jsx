import { useState, useEffect } from 'react'
import { EMOJIS, EMOJI_LABELS, toggleEmojiReaction, getEmojiCounts } from '../firebase/reactions'

/**
 * Emoji reaction bar — 5 emojis below post content.
 * Self-loads aggregate counts from Firestore on mount.
 * Fully optimistic updates with rollback on error.
 */
export default function ReactionBar({ postId, userId, initialReaction }) {
  const [userReaction, setUserReaction] = useState(initialReaction || null)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(false)

  // Load real counts from Firestore on mount
  useEffect(() => {
    if (!postId) return
    getEmojiCounts(postId).then(setCounts).catch(() => {})
  }, [postId])

  async function handleReact(emoji, e) {
    e.stopPropagation()
    if (loading || !userId) return
    setLoading(true)

    const old  = userReaction
    const next = old === emoji ? null : emoji

    // Optimistic update
    setUserReaction(next)
    setCounts(prev => {
      const c = { ...prev }
      if (old)  c[old]  = Math.max(0, (c[old]  || 1) - 1)
      if (next) c[next] = (c[next] || 0) + 1
      return c
    })

    try {
      await toggleEmojiReaction(postId, userId, emoji)
    } catch (err) {
      console.error('Reaction error:', err)
      // Revert on failure — re-fetch real counts
      setUserReaction(old)
      getEmojiCounts(postId).then(setCounts).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '2px 0 4px' }}
      onClick={e => e.stopPropagation()}
    >
      {EMOJIS.map(emoji => {
        const count  = Math.max(0, counts[emoji] || 0)
        const active = userReaction === emoji
        return (
          <button
            key={emoji}
            onClick={e => handleReact(emoji, e)}
            title={EMOJI_LABELS[emoji]}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 9px',
              borderRadius: 99,
              background: active ? 'rgba(160,120,255,0.15)' : 'var(--bg-input)',
              border: `1px solid ${active ? 'rgba(160,120,255,0.5)' : 'var(--border-subtle)'}`,
              cursor: loading ? 'default' : 'pointer',
              fontSize: 15,
              fontFamily: 'var(--font-sans)',
              color: active ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
              fontWeight: active ? 700 : 400,
              transition: 'all 0.15s',
              opacity: loading ? 0.6 : 1,
              transform: active ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span style={{ fontSize: 11, lineHeight: 1 }}>{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
