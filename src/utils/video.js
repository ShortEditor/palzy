/**
 * Admin-only video helpers: access check, limits, and Cloudinary delivery URLs.
 * The video stays a single original upload; every viewer-facing URL is a
 * delivery transformation (cached on the CDN), so there is no extra storage.
 */
export const VIDEO_ADMIN_EMAIL = 'shorteditor4@gmail.com'
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100 MB (private S3, matches the server-side limit)
export const MAX_VIDEO_SECONDS = 60
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

/** True only for the Palzy admin account that owns video uploads. */
export function canUploadVideo(user, profile) {
  return Boolean(
    user?.email &&
    profile?.isAdmin === true &&
    user.email.toLowerCase() === VIDEO_ADMIN_EMAIL,
  )
}

/** Returns an error message, or null when the file is acceptable. */
export function validateVideoFile(file) {
  if (!file) return 'Choose a video.'
  if (!VIDEO_TYPES.includes(file.type)) return 'Use an MP4, MOV or WebM video.'
  if (file.size > MAX_VIDEO_BYTES) return 'Video is over 100 MB. Compress it first.'
  return null
}

const MARK = '/video/upload/'

function withTransform(url, transform, ext) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes(MARK)) return url
  let out = url.replace(MARK, `${MARK}${transform}/`)
  if (ext) out = out.replace(/\.[a-z0-9]+(\?.*)?$/i, `.${ext}`)
  return out
}

/** Compressed, 720p-capped stream (auto codec/quality) for playback. */
export function videoStreamUrl(url) {
  return withTransform(url, 'f_auto:video,q_auto:eco,c_limit,w_720,vc_auto')
}

/** Small JPG poster from the first second; shown instead of loading the video. */
export function videoPosterUrl(url) {
  return withTransform(url, 'so_1,f_jpg,q_auto:low,c_limit,w_720', 'jpg')
}

/** Videos stored in the private S3 bucket are saved as "s3:<key>". */
export function isS3Video(url) {
  return typeof url === 'string' && url.startsWith('s3:')
}
export function s3Key(url) {
  return isS3Video(url) ? url.slice(3) : null
}

/** Grabs a small JPEG frame (about 1s in) to use as the poster. Resolves null on failure. */
export function captureVideoPoster(file, maxWidth = 640) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    const done = blob => { URL.revokeObjectURL(url); resolve(blob) }
    v.muted = true; v.playsInline = true; v.preload = 'metadata'
    v.onerror = () => done(null)
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 1) / 2) }
    v.onseeked = () => {
      try {
        const scale = Math.min(1, maxWidth / (v.videoWidth || maxWidth))
        const c = document.createElement('canvas')
        c.width = Math.round((v.videoWidth || maxWidth) * scale)
        c.height = Math.round((v.videoHeight || maxWidth * 0.5625) * scale)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        c.toBlob(b => done(b), 'image/jpeg', 0.7)
      } catch { done(null) }
    }
    v.src = url
    setTimeout(() => done(null), 8000) // never block posting on a slow poster grab
  })
}

/** Attributes that strip the native player UI and its download/PiP/cast options. */
export const LOCKED_VIDEO_PROPS = {
  controls: false,
  controlsList: 'nodownload noplaybackrate noremoteplayback nofullscreen',
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  playsInline: true,
  loop: true,
  draggable: false,
}
