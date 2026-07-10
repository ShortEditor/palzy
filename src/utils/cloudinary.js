/**
 * Cloudinary unsigned upload utility.
 * - Compresses images before upload
 * - Sets a structured public_id so assets are searchable (not "blob")
 * - Attaches Cloudinary tags + context metadata for organisation
 *
 * Folder / naming scheme:
 *   palzy/{folder}/{userId}_{yyyymmdd}_{hhmmss}_{random4}
 *
 * Example:
 *   palzy/posts/abc123_20260710_142300_x7k2
 *   palzy/avatars/abc123_20260710_142300_r3m9
 *   palzy/quote-cards/abc123_20260710_142300_q1p5
 */
import imageCompression from 'browser-image-compression'

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compact timestamp: 20260710_142300 */
function _timestamp() {
  const d   = new Date()
  const pad = (n, l = 2) => String(n).padStart(l, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

/** 4-char alphanumeric suffix to prevent collisions */
function _uid4() {
  return Math.random().toString(36).slice(2, 6)
}

/**
 * Build a structured Cloudinary public_id.
 * Result: palzy/{folder}/{userId}_{timestamp}_{uid4}
 */
function _publicId(folder, userId) {
  const safe = (userId ?? 'anon').slice(0, 12)   // trim long UIDs
  return `palzy/${folder}/${safe}_${_timestamp()}_${_uid4()}`
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compress and upload an image to Cloudinary with structured naming.
 *
 * @param {File|Blob} file   - Raw File / Blob from input, canvas, etc.
 * @param {string}    folder - Cloudinary sub-folder: 'posts' | 'avatars' | 'quote-cards' | 'banners'
 * @param {string}    userId - Firebase UID of the uploader (for naming + tagging)
 * @param {object}   [meta]  - Optional extra context key-value pairs stored in Cloudinary
 * @returns {Promise<string>} Secure CDN URL of the uploaded image
 */
export async function uploadImage(file, folder = 'posts', userId = 'anon', meta = {}) {
  // 1. Ensure it's a proper File so imageCompression accepts it
  const asFile = file instanceof File
    ? file
    : new File([file], `upload.${_extFromBlob(file)}`, { type: file.type || 'image/webp' })

  // 2. Compress (only if size > 1.5MB and not a quote card to preserve pixel-perfect gradient quality)
  const shouldCompress = asFile.size > 1572864 && folder !== 'quote-cards'
  const compressed = shouldCompress
    ? await imageCompression(asFile, COMPRESSION_OPTIONS)
    : asFile

  // 3. Build the public_id (structured filename)
  const publicId = _publicId(folder, userId)

  // 4. Build context string: key=value|key=value (Cloudinary format)
  const context = [
    `uid=${userId}`,
    `folder=${folder}`,
    `app=palzy`,
    ...Object.entries(meta).map(([k, v]) => `${k}=${v}`),
  ].join('|')

  // 5. Tags (comma-separated) for bulk filtering
  const tags = ['palzy', folder, `user_${(userId ?? '').slice(0, 8)}`].join(',')

  // 6. Build FormData
  const formData = new FormData()
  formData.append('file',           compressed)
  formData.append('upload_preset',  UPLOAD_PRESET)
  formData.append('public_id',      publicId)   // structured name, not "blob"
  formData.append('context',        context)    // searchable metadata
  formData.append('tags',           tags)       // bulk tag filtering

  // 7. POST
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url
}

// ─── Private ──────────────────────────────────────────────────────────────────

function _extFromBlob(blob) {
  if (!blob?.type) return 'webp'
  if (blob.type.includes('png'))  return 'png'
  if (blob.type.includes('jpeg')) return 'jpg'
  if (blob.type.includes('gif'))  return 'gif'
  return 'webp'
}
