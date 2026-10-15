// POST /api/video-upload  { contentType, size }  (admin only)
// Returns a short-lived presigned POST for a private S3 object. S3 itself
// enforces the size range, content type and exact key, so the admin check
// cannot be bypassed by calling S3 directly.
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { randomBytes } from 'node:crypto'
import { config, s3, verifyUser, isAdminUser, sameOrigin, MAX_BYTES, TYPE_EXT } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'origin' })
  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ error: 'auth' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'admin only' })

  const { contentType, size } = req.body || {}
  const ext = TYPE_EXT[contentType]
  if (!ext) return res.status(400).json({ error: 'type' })
  if (!Number.isFinite(size) || size < 1 || size > MAX_BYTES) return res.status(400).json({ error: 'size' })

  const c = config()
  if (!c.bucket || !c.accessKeyId || !c.secretAccessKey) return res.status(500).json({ error: 'not configured' })
  const key = `videos/${user.uid}/${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`
  const post = await createPresignedPost(s3(), {
    Bucket: c.bucket,
    Key: key,
    Conditions: [['content-length-range', 1, MAX_BYTES], ['eq', '$Content-Type', contentType]],
    Fields: { 'Content-Type': contentType },
    Expires: 300,
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ url: post.url, fields: post.fields, key })
}
