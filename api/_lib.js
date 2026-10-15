// Shared helpers for the video API routes (underscore prefix = not a route).
import { S3Client } from '@aws-sdk/client-s3'

export const ADMIN_EMAIL = 'shorteditor4@gmail.com'
export const MAX_BYTES = 100 * 1024 * 1024
export const TYPE_EXT = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }
export const KEY_RE = /^videos\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_.-]{1,80}$/

export function config() {
  return {
    bucket: process.env.PALZY_S3_BUCKET || process.env.AWS_S3_BUCKET,
    region: process.env.PALZY_AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.PALZY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.PALZY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  }
}

let client
export function s3() {
  if (!client) {
    const c = config()
    client = new S3Client({ region: c.region, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } })
  }
  return client
}

/**
 * Verifies a Firebase ID token via Google's public lookup endpoint (no admin SDK,
 * no service account). Returns { uid, email, emailVerified } or null.
 */
export async function verifyUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  const apiKey = process.env.VITE_FIREBASE_API_KEY
  if (!m || !apiKey) return null
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: m[1] }),
    })
    if (!r.ok) return null
    const u = (await r.json()).users?.[0]
    if (!u || u.disabled) return null
    return { uid: u.localId, email: (u.email || '').toLowerCase(), emailVerified: u.emailVerified === true }
  } catch { return null }
}

export function isAdminUser(u) {
  return Boolean(u && u.emailVerified && u.email === ADMIN_EMAIL)
}

export function sameOrigin(req) {
  const o = req.headers.origin
  return !o || /^https:\/\/([a-z0-9-]+\.)?palzy\.website$/.test(o) || /^https:\/\/palzy[a-z0-9-]*\.vercel\.app$/.test(o) || /^http:\/\/localhost:\d+$/.test(o)
}
