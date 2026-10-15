import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAdminUser, KEY_RE, sameOrigin, verifyUser } from '../api/_lib.js'
import upload from '../api/video-upload.js'
import playUrl from '../api/video-url.js'

const res = () => { const r = { code: 0, body: null, headers: {}, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, setHeader(k, v) { r.headers[k] = v } }; return r }
const realFetch = globalThis.fetch
const mockUser = u => { globalThis.fetch = async () => ({ ok: !!u, json: async () => ({ users: u ? [u] : [] }) }) }
process.env.VITE_FIREBASE_API_KEY = 'k'
process.env.PALZY_S3_BUCKET = 'b'; process.env.PALZY_AWS_ACCESS_KEY_ID = 'AKIAEXAMPLE'; process.env.PALZY_AWS_SECRET_ACCESS_KEY = 's'; process.env.PALZY_AWS_REGION = 'ap-south-1'
const req = (extra = {}) => ({ method: 'POST', headers: { authorization: 'Bearer t', origin: 'https://palzy.website' }, body: { contentType: 'video/mp4', size: 1000 }, query: {}, ...extra })

test('admin check requires the verified admin email', () => {
  assert.equal(isAdminUser({ email: 'shorteditor4@gmail.com', emailVerified: true }), true)
  assert.equal(isAdminUser({ email: 'shorteditor4@gmail.com', emailVerified: false }), false)
  assert.equal(isAdminUser({ email: 'x@y.com', emailVerified: true }), false)
  assert.equal(isAdminUser(null), false)
})
test('key and origin validation', () => {
  assert.ok(KEY_RE.test('videos/uid_1/abc-123.mp4'))
  for (const bad of ['videos/../x', 'other/a/b.mp4', 'videos/a/b/c.mp4', 'videos//x.mp4']) assert.ok(!KEY_RE.test(bad), bad)
  assert.ok(sameOrigin({ headers: { origin: 'https://palzy.website' } }))
  assert.ok(!sameOrigin({ headers: { origin: 'https://evil.com' } }))
})
test('upload rejects anonymous, non-admin, bad type and oversize', async () => {
  mockUser(null); let r = res(); await upload(req(), r); assert.equal(r.code, 401)
  mockUser({ localId: 'u1', email: 'a@b.com', emailVerified: true }); r = res(); await upload(req(), r); assert.equal(r.code, 403)
  mockUser({ localId: 'a', email: 'shorteditor4@gmail.com', emailVerified: true })
  r = res(); await upload(req({ body: { contentType: 'image/png', size: 10 } }), r); assert.equal(r.code, 400)
  r = res(); await upload(req({ body: { contentType: 'video/mp4', size: 100 * 1024 * 1024 + 1 } }), r); assert.equal(r.code, 400)
  r = res(); await upload(req({ headers: { authorization: 'Bearer t', origin: 'https://evil.com' } }), r); assert.equal(r.code, 403)
  r = res(); await upload(req({ method: 'GET' }), r); assert.equal(r.code, 405)
})
test('admin gets a presigned post limited to size, type and own key prefix', async () => {
  mockUser({ localId: 'adm', email: 'shorteditor4@gmail.com', emailVerified: true })
  const r = res(); await upload(req(), r)
  assert.equal(r.code, 200)
  assert.match(r.body.key, /^videos\/adm\/[a-z0-9-]+\.mp4$/)
  const policy = JSON.parse(Buffer.from(r.body.fields.Policy, 'base64').toString())
  assert.deepEqual(policy.conditions.find(c => c[0] === 'content-length-range'), ['content-length-range', 1, 104857600])
  assert.ok(policy.conditions.some(c => c[0] === 'eq' && c[1] === '$Content-Type' && c[2] === 'video/mp4'))
})
test('play url needs a signed-in user and a valid key', async () => {
  mockUser(null); let r = res(); await playUrl(req({ method: 'GET', query: { key: 'videos/a/b.mp4' } }), r); assert.equal(r.code, 401)
  mockUser({ localId: 'u1', email: 'a@b.com', emailVerified: false })
  r = res(); await playUrl(req({ method: 'GET', query: { key: '../etc' } }), r); assert.equal(r.code, 400)
  r = res(); await playUrl(req({ method: 'GET', query: { key: 'videos/a/b.mp4' } }), r)
  assert.equal(r.code, 200); assert.match(r.body.url, /X-Amz-Signature=/)
})
test.after(() => { globalThis.fetch = realFetch })
