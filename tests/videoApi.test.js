import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAdminUser, KEY_RE, sameOrigin, regionFromBucket, config } from '../api/_lib.js'
import upload from '../api/video-upload.js'
import playUrl from '../api/video-url.js'

const res = () => { const r = { code: 0, body: null, headers: {}, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, setHeader(k, v) { r.headers[k] = v } }; return r }
const realFetch = globalThis.fetch
// u = token lookup result; isAdminFlag = users/{uid}.isAdmin in Firestore
const mockUser = (u, isAdminFlag = true) => {
  globalThis.fetch = async url => String(url).includes('firestore.googleapis.com')
    ? { ok: true, json: async () => ({ fields: { isAdmin: { booleanValue: isAdminFlag } } }) }
    : { ok: !!u, json: async () => ({ users: u ? [u] : [] }) }
}
process.env.VITE_FIREBASE_PROJECT_ID = 'proj'
process.env.VITE_FIREBASE_API_KEY = 'k'
process.env.PALZY_S3_BUCKET = 'b'; process.env.PALZY_AWS_ACCESS_KEY_ID = 'AKIAEXAMPLE'; process.env.PALZY_AWS_SECRET_ACCESS_KEY = 's'; process.env.PALZY_AWS_REGION = 'ap-south-1'
const req = (extra = {}) => ({ method: 'POST', headers: { authorization: 'Bearer t', origin: 'https://palzy.website' }, body: { contentType: 'video/mp4', size: 1000 }, query: {}, ...extra })

test('admin check needs the exact email and the Firestore isAdmin flag', async () => {
  const r = { headers: { authorization: 'Bearer t' } }
  mockUser(null, true); assert.equal(await isAdminUser({ uid: 'a', email: 'shorteditor4@gmail.com' }, r), true)
  mockUser(null, false); assert.equal(await isAdminUser({ uid: 'a', email: 'shorteditor4@gmail.com' }, r), false)
  mockUser(null, true); assert.equal(await isAdminUser({ uid: 'a', email: 'x@y.com' }, r), false)
  assert.equal(await isAdminUser(null, r), false)
})
test('region comes from the bucket name, not the Vercel-injected AWS_REGION', () => {
  assert.equal(regionFromBucket('palzy-video-prod-357601816129-ap-south-1'), 'ap-south-1')
  const old = process.env.AWS_REGION; process.env.AWS_REGION = 'us-east-1'; process.env.PALZY_S3_BUCKET = 'palzy-video-prod-1-ap-south-1'
  assert.equal(config().region, 'ap-south-1')
  process.env.PALZY_S3_BUCKET = 'b'; process.env.AWS_REGION = old ?? ''
})
test('key and origin validation', () => {
  assert.ok(KEY_RE.test('videos/uid_1/abc-123.mp4'))
  for (const bad of ['videos/../x', 'other/a/b.mp4', 'videos/a/b/c.mp4', 'videos//x.mp4']) assert.ok(!KEY_RE.test(bad), bad)
  assert.ok(sameOrigin({ headers: { origin: 'https://palzy.website' } }))
  assert.ok(!sameOrigin({ headers: { origin: 'https://evil.com' } }))
})
test('upload rejects anonymous, non-admin, bad type and oversize', async () => {
  mockUser(null); let r = res(); await upload(req(), r); assert.equal(r.code, 401)
  mockUser({ localId: 'u1', email: 'a@b.com' }); r = res(); await upload(req(), r); assert.equal(r.code, 403)
  mockUser({ localId: 'a', email: 'shorteditor4@gmail.com' }, false); r = res(); await upload(req(), r); assert.equal(r.code, 403)
  mockUser({ localId: 'a', email: 'shorteditor4@gmail.com' })
  r = res(); await upload(req({ body: { contentType: 'image/png', size: 10 } }), r); assert.equal(r.code, 400)
  r = res(); await upload(req({ body: { contentType: 'video/mp4', size: 100 * 1024 * 1024 + 1 } }), r); assert.equal(r.code, 400)
  r = res(); await upload(req({ headers: { authorization: 'Bearer t', origin: 'https://evil.com' } }), r); assert.equal(r.code, 403)
  r = res(); await upload(req({ method: 'GET' }), r); assert.equal(r.code, 405)
})
test('admin gets a presigned post limited to size, type and own key prefix', async () => {
  mockUser({ localId: 'adm', email: 'shorteditor4@gmail.com' })
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
