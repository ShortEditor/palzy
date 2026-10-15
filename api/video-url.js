// GET /api/video-url?key=videos/...  (any signed-in user)
// Returns a short-lived presigned GET so the private bucket never serves
// anonymous traffic. Called only when a viewer taps play.
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config, s3, verifyUser, sameOrigin, KEY_RE } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'origin' })
  const user = await verifyUser(req)
  if (!user) return res.status(401).json({ error: 'auth' })
  const key = String(req.query?.key || '')
  if (!KEY_RE.test(key)) return res.status(400).json({ error: 'key' })
  const c = config()
  if (!c.bucket) return res.status(500).json({ error: 'not configured' })
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket: c.bucket, Key: key }), { expiresIn: 3600 })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ url, expiresIn: 3600 })
}
