import { auth } from '../firebase/config'
import { isS3Video, s3Key } from './video'

async function authHeader() {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Please sign in again.')
  return { Authorization: `Bearer ${token}` }
}

/**
 * Admin-only: uploads straight from the browser to the private S3 bucket using a
 * short-lived presigned POST (the file never passes through our server).
 * @returns {Promise<string>} "s3:<key>" to store on the post
 */
export async function uploadVideoToS3(file) {
  const res = await fetch('/api/video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  })
  if (!res.ok) throw new Error('Video upload is not allowed.')
  const { url, fields, key } = await res.json()
  const form = new FormData()
  Object.entries(fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file) // must be last
  const up = await fetch(url, { method: 'POST', body: form })
  if (!up.ok) throw new Error('Video upload failed')
  return `s3:${key}`
}

const cache = new Map() // key -> { url, exp }

/** Short-lived playback URL for a post's video (cached ~50 min per key). */
export async function getVideoPlayUrl(videoURL) {
  if (!isS3Video(videoURL)) return videoURL
  const key = s3Key(videoURL)
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.url
  const res = await fetch(`/api/video-url?key=${encodeURIComponent(key)}`, { headers: await authHeader() })
  if (!res.ok) throw new Error('Could not load video')
  const { url, expiresIn } = await res.json()
  cache.set(key, { url, exp: Date.now() + Math.min(expiresIn, 3600) * 1000 - 600000 })
  return url
}
