export const FEED_PAGE_SIZE = 7

export function scorePost(post, sessionSeed) {
  const ageMs    = Date.now() - (post.createdAt?.toMillis?.() ?? Date.now())
  const ageHours = ageMs / 3_600_000

  // ── Recency: strong boost for <6h, smooth decay to 0 at 72h ──
  const recencyBonus = ageHours < 6
    ? 60 - ageHours * 2            // 60→48 in first 6 hours
    : Math.max(0, 48 * Math.exp(-0.04 * (ageHours - 6)))  // exponential decay

  // ── Engagement signals ──
  const likes    = post.likeCount    ?? 0
  const comments = post.commentCount ?? 0
  const engagement = likes * 3 + comments * 4

  // ── Engagement density: engagement-per-hour (rewards quick virality) ──
  const density = ageHours > 0.5 ? (likes + comments) / ageHours : (likes + comments) * 2

  // ── Content type boost: carousel +10, image +8, quotes +5 ──
  const typeBoost = post.type === 'carousel' ? 10
                  : post.type === 'image' ? 8
                  : post.type === 'quote' ? 5
                  : 0

  // ── Follow boost ──
  const followBoost = post._isFollowed ? 20 : 0

  // ── Controlled randomness: jitter ±12 so refreshes feel fresh ──
  // Uses a deterministic-ish hash per post+session so pagination stays stable
  const hash = simpleHash(post.id + sessionSeed)
  const jitter = (hash % 2400 - 1200) / 100  // range: -12 to +12

  return recencyBonus + engagement + density * 2 + typeBoost + followBoost + jitter
}

/** Simple numeric hash for deterministic randomness within a session */
function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// Read small chronological batches from each source, then rank only that batch.
// Cursors advance over all fetched docs, including duplicates. No writes or stored
// aggregate counters are used. A session keeps its seed, seen IDs and leftovers.
export function createFeedSession({ sources, readSource, countPosts, followingIds, seed }) {
  return { sources: sources.map(source => ({ ...source, cursor: null, done: false })),
    readSource, countPosts, followingIds: new Set(followingIds), seed,
    seen: new Set(), ranked: [], inFlight: null }
}

export async function getSessionPage(session, offset = 0) {
  if (offset >= session.ranked.length && session.sources.some(source => !source.done)) {
    // One source round at a time, also safe if callers request the same page twice.
    if (!session.inFlight) session.inFlight = (async () => {
      while (offset >= session.ranked.length && session.sources.some(source => !source.done)) {
        const active = session.sources.filter(source => !source.done)
        // Commit cursor advancement only after every read and count succeeds.
        const results = await Promise.all(active.map(source => session.readSource(source)))
        const unique = new Map()
        results.forEach(result => result.posts.forEach(post => {
          if (!session.seen.has(post.id)) unique.set(post.id, post)
        }))
        const counted = await session.countPosts([...unique.values()])
        const ranked = counted.map(post => {
          const _isFollowed = session.followingIds.has(post.authorId)
          return { ...post, _score: scorePost({ ...post, _isFollowed }, session.seed) }
        }).sort((a, b) => b._score - a._score)
        results.forEach((result, i) => {
          active[i].cursor = result.cursor
          active[i].done = result.done
        })
        ranked.forEach(post => session.seen.add(post.id))
        session.ranked.push(...ranked)
      }
    })().finally(() => { session.inFlight = null })
    await session.inFlight
  }
  const posts = session.ranked.slice(offset, offset + FEED_PAGE_SIZE)
  const nextOffset = offset + posts.length
  return { posts, nextOffset, hasMore: nextOffset < session.ranked.length || session.sources.some(source => !source.done) }
}
