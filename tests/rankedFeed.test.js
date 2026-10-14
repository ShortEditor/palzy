import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFeedSession, getSessionPage, FEED_PAGE_SIZE, scorePost } from '../src/utils/rankedFeed.js'
const post = id => ({ id, authorId: 'a', createdAt: { toMillis: () => Date.now() - 3600000 }, likeCount: 99999 })
function setup(sourceIds) {
  const reads = [], counts = []
  const session = createFeedSession({ sources: sourceIds.map(ids => ({ ids })), followingIds: ['a'], seed: 'stable',
    readSource: async source => {
      reads.push(source.cursor)
      const start = source.cursor ?? 0
      const ids = source.ids.slice(start, start + FEED_PAGE_SIZE)
      return { posts: ids.map(post), cursor: start + ids.length, done: ids.length < FEED_PAGE_SIZE }
    },
    countPosts: async posts => {
      counts.push(posts.map(p => p.id))
      return posts.map(p => ({ ...p, likeCount: 1, commentCount: 0 }))
    } })
  return { session, reads, counts }
}
test('first load reads only seven per source; cached leftovers cause no reads', async () => {
  const { session, reads, counts } = setup([Array.from({length: 30}, (_, i) => 'p'+i), Array.from({length: 30}, (_, i) => 'q'+i)])
  const first = await getSessionPage(session)
  assert.equal(first.posts.length, 7)
  assert.equal(reads.length, 2)
  assert.equal(counts[0].length, 14)
  assert.ok(first.posts.every(p => p.likeCount === 1))
  const second = await getSessionPage(session, first.nextOffset)
  assert.equal(second.posts.length, 7)
  assert.equal(reads.length, 2)
  await getSessionPage(session, second.nextOffset)
  assert.equal(reads.length, 4)
})
test('duplicates across sources/pages are counted once and scrolling reaches all posts', async () => {
  const ids = Array.from({length: 19}, (_, i) => 'p'+i)
  const { session, counts } = setup([ids, ids])
  const found = []
  let offset = 0, more = true
  while (more) {
    const page = await getSessionPage(session, offset)
    found.push(...page.posts.map(p => p.id)); offset = page.nextOffset; more = page.hasMore
  }
  assert.equal(found.length, 19)
  assert.equal(new Set(found).size, 19)
  assert.equal(counts.flat().length, 19)
})
test('concurrent requests share a read and return the same stable page', async () => {
  const { session, reads } = setup([Array.from({length: 8}, (_, i) => 'p'+i)])
  const [a,b] = await Promise.all([getSessionPage(session), getSessionPage(session)])
  assert.deepEqual(a,b)
  assert.equal(reads.length, 1)
})
test('failed counts do not advance cursors or lose posts; retry succeeds', async () => {
  const { session } = setup([['p1','p2']])
  const original = session.countPosts
  session.countPosts = async () => { throw new Error('offline') }
  await assert.rejects(getSessionPage(session), /offline/)
  assert.equal(session.sources[0].cursor, null)
  assert.equal(session.seen.size, 0)
  session.countPosts = original
  const page = await getSessionPage(session)
  assert.equal(page.posts.length, 2)
  assert.equal(page.hasMore, false)
})
test('session/user state is isolated, refresh starts at newest source cursor', async () => {
  const a = setup([['old']]); await getSessionPage(a.session)
  const b = setup([['new','old']]); const page = await getSessionPage(b.session)
  assert.equal(b.reads[0], null)
  assert.equal(page.posts.length, 2)
  assert.equal(a.session.ranked.length, 1)
})
test('same scoring formula boosts verified engagement and follows', () => {
  const base = { ...post('p'), likeCount: 0, commentCount: 0 }
  assert.ok(scorePost({...base, likeCount: 5}, 'seed') > scorePost(base, 'seed'))
  assert.ok(scorePost({...base, _isFollowed: true}, 'seed') > scorePost(base, 'seed'))
})
