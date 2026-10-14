import test from 'node:test'
import assert from 'node:assert/strict'
import { allowsCall, checkCallPermission, normalizeCallPrivacy } from '../src/utils/callPrivacy.js'

test('missing and invalid values default to Only people I follow', () => {
  for (const value of [undefined, null, '', 'followers', 'invalid']) {
    assert.equal(normalizeCallPrivacy(value), 'following')
    assert.equal(allowsCall(value, false), false)
    assert.equal(allowsCall(value, true), true)
  }
})
test('all three preferences enforce their permission matrix', () => {
  for (const follows of [true, false]) {
    assert.equal(allowsCall('none', follows), false)
    assert.equal(allowsCall('everyone', follows), true)
    assert.equal(allowsCall('following', follows), follows)
  }
})
test('only the recipient following the caller grants permission, not the reverse', async () => {
  const calls = []
  const sources = { readUser: async () => ({}), readFollow: async (a, b) => { calls.push([a, b]); return a === 'recipient' && b === 'caller' } }
  assert.equal(await checkCallPermission('caller', 'recipient', sources), true)
  assert.deepEqual(calls, [['recipient', 'caller']])
  sources.readFollow = async (a, b) => a === 'caller' && b === 'recipient'
  assert.equal(await checkCallPermission('caller', 'recipient', sources), false)
})
test('no one and everyone do not need a follow lookup', async () => {
  const readFollow = () => { throw Error('must not look up') }
  for (const [callPrivacy, expected] of [['none', false], ['everyone', true]]) {
    assert.equal(await checkCallPermission('a', 'b', { readUser: async () => ({ callPrivacy }), readFollow }), expected)
  }
})
test('missing accounts, self calls and absent identity are denied', async () => {
  const sources = { readUser: async () => null, readFollow: async () => true }
  for (const [a, b] of [['a', 'b'], ['a', 'a'], [null, 'b'], ['a', null]]) {
    assert.equal(await checkCallPermission(a, b, sources), false)
  }
})
test('fresh reads respect preference and follow changes; lookup failures cannot allow a call', async () => {
  let callPrivacy = 'everyone', follows = false
  const sources = { readUser: async () => ({ callPrivacy }), readFollow: async () => follows }
  assert.equal(await checkCallPermission('a', 'b', sources), true)
  callPrivacy = 'following'
  assert.equal(await checkCallPermission('a', 'b', sources), false)
  follows = true
  assert.equal(await checkCallPermission('a', 'b', sources), true)
  callPrivacy = 'none'
  assert.equal(await checkCallPermission('a', 'b', sources), false)
  await assert.rejects(checkCallPermission('a', 'b', { ...sources, readUser: async () => { throw Error('offline') } }), /offline/)
})
