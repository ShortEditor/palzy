import { auth } from '../firebase/config'
import { isS3Video, s3Key, s3ErrorCode } from './video'

async function authHeader() {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Please sign in again.')
  return { Authorization: `Bearer ${token}` }
}

function fail(message) {
  const e = new Error(message); e.userMessage = message; return e
}

/**
 * Admin-only: uploads straight from the browser to the private S3 bucket using a
 * short-lived presigned POST (the file never passes through our server).
 * @param {File} file
 * @param {(pct:number)=>void} [onProgress] called with 0-100 while uploading
 * @returns {Promise<string>} "s3:<key>" to store on the post
 */
export async function uploadVideoToS3(file, onProgress) {
  let res
  try {
    res = await fetch('/api/video-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    })
  } catch { throw fail('Video upload failed: could not reach the server.') }
  if (!res.ok) {
    const code = (await res.json().catch(() => ({}))).error
    const msg = {
      auth: 'Video upload failed: sign in again.',
      'admin only': 'Video upload failed: this account is not allowed to upload video.',
      'not configured': 'Video upload failed: storage is not configured.',
      size: 'Video upload failed: file is over 100 MB.',
      type: 'Video upload failed: use an MP4, MOV or WebM file.',
    }[code]
    throw fail(msg || `Video upload failed (server ${res.status}).`)
  }
  const { url, fields, key } = await res.json()
  const form = new FormData()
  Object.entries(fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file) // must be last
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))) }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? (onProgress?.(100), resolve()) : reject(fail(`Video upload failed (storage ${xhr.status}${s3ErrorCode(xhr.responseText)}).`)))
    xhr.onerror = () => reject(fail('Video upload failed: network error while sending the file.'))
    xhr.ontimeout = () => reject(fail('Video upload timed out.'))
    xhr.send(form)
  })
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
