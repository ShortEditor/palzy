/**
 * Cloudinary unsigned upload utility.
 * Uses client-side compression before uploading to keep bandwidth low.
 */
import imageCompression from 'browser-image-compression'

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp',
}

/**
 * Compress and upload an image file to Cloudinary.
 * @param {File} file - Raw File object from input/dropzone
 * @param {string} folder - Cloudinary folder (e.g. 'posts' | 'avatars')
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export async function uploadImage(file, folder = 'posts') {
  // 1. Compress first
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS)

  // 2. Build form data for unsigned upload
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `palzy/${folder}`)

  // 3. POST to Cloudinary
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url
}
