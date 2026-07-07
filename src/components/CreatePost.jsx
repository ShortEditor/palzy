import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../contexts/AuthContext'
import { createPost } from '../firebase/posts'
import { uploadImage } from '../utils/cloudinary'
import Avatar from './Avatar'
import Icon from './Icon'
import toast from 'react-hot-toast'

const MAX_CHARS = 280

export default function CreatePost({ onPostCreated }) {
  const { currentUser, userProfile } = useAuth()

  const [text, setText]           = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  const charsLeft = MAX_CHARS - text.length

  // Image drop
  const onDrop = useCallback((accepted) => {
    const file = accepted[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, open: openFilePicker } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: true,  // we control the click via the button
    noKeyboard: true,
  })

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageFile)   { toast.error('Write something or add an image!'); return }
    if (text.length > MAX_CHARS)  { toast.error('Post is too long!'); return }

    setSubmitting(true)
    try {
      let imageURL = null
      if (imageFile) {
        imageURL = await uploadImage(imageFile, 'posts')
      }
      await createPost({ authorId: currentUser.uid, content: trimmed, imageURL })
      setText('')
      removeImage()
      toast.success('Posted!')
      onPostCreated?.()
    } catch (err) {
      console.error(err)
      toast.error('Could not post. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Ctrl+Enter to submit
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
  }

  const isEmpty     = !text.trim() && !imageFile
  const isOverLimit = text.length > MAX_CHARS

  return (
    <div className="create-post-bar" {...getRootProps()}>
      <input {...getInputProps()} />

      <Avatar src={userProfile?.photoURL} name={userProfile?.name} size="md" />

      <div className="create-post-input-wrap">
        <textarea
          ref={textareaRef}
          id="create-post-textarea"
          className="create-post-textarea"
          placeholder="What's on your mind?"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={text ? 3 : 2}
          maxLength={MAX_CHARS + 20}
          aria-label="Write a post"
        />

        {/* Image preview */}
        {imagePreview && (
          <div className="image-preview-wrap">
            <img src={imagePreview} alt="Selected image preview" />
            <button
              className="image-preview-remove"
              onClick={removeImage}
              aria-label="Remove image"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action row */}
        {(text || imageFile) && (
          <div className="create-post-actions">
            <div className="create-post-tools">
              {/* Image picker */}
              <button
                id="btn-add-image"
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={openFilePicker}
                disabled={!!imageFile}
                title="Add image"
                aria-label="Add image"
              >
                <Icon name="image" size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {/* Char counter */}
              <span className={`char-counter ${charsLeft <= 20 && charsLeft >= 0 ? 'warn' : ''} ${isOverLimit ? 'over' : ''}`}>
                {charsLeft < MAX_CHARS ? charsLeft : ''}
              </span>

              <button
                id="btn-submit-post"
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={isEmpty || isOverLimit || submitting}
                aria-label="Submit post"
              >
                {submitting
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Posting…</>
                  : <><Icon name="send" size={14} /> Post</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
