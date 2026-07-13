import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createPost } from '../firebase/posts'
import { uploadImage } from '../utils/cloudinary'
import Avatar from './Avatar'
import Icon from './Icon'
import QuoteCardEditor from './QuoteCardEditor'
import toast from 'react-hot-toast'

const MAX_CHARS = 280

export default function CreatePost({ onPostCreated }) {
  const { currentUser, userProfile } = useAuth()

  const [text, setText]             = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showQuoteEditor, setShowQuoteEditor] = useState(false)
  const [isDoubt, setIsDoubt]       = useState(false)
  const [isNote, setIsNote]         = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const charsLeft   = MAX_CHARS - text.length
  const isEmpty     = !text.trim() && !imageFile
  const isOverLimit = text.length > MAX_CHARS

  // ── Handle file chosen via native input ─────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  // ── Drag-and-drop support ─────────────────────────────────
  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  function handleDragOver(e) { e.preventDefault() }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageFile)  { toast.error('Write something or add an image!'); return }
    if (text.length > MAX_CHARS) { toast.error('Post is too long!'); return }

    setSubmitting(true)
    try {
      let imageURL = null
      if (imageFile) {
        imageURL = await uploadImage(imageFile, 'posts', currentUser.uid)
      }
      const tags = []
      if (isDoubt) tags.push('doubt')
      if (isNote) tags.push('note')

      const newPost = await createPost({
        authorId: currentUser.uid,
        content: trimmed,
        imageURL,
        tags,
      })
      setText('')
      removeImage()
      setIsDoubt(false)
      setIsNote(false)
      toast.success('Posted! 🎉')
      onPostCreated?.(newPost)
    } catch (err) {
      console.error(err)
      toast.error('Could not post. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
  }

  return (
    <>
      <div
        className="create-post-bar"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          id="create-post-file-input"
        />

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

          {/* Tag pills row — only shown when textarea is focused/has content */}
          {(text || isDoubt || isNote) && (
            <div className="create-post-tags">
              {/* Doubt toggle */}
              <button
                id="btn-mark-doubt"
                type="button"
                onClick={() => {
                  setIsDoubt(prev => !prev)
                  if (!isDoubt) setIsNote(false)
                }}
                disabled={submitting}
                title={isDoubt ? 'Remove doubt tag' : 'Mark as doubt'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700,
                  color: isDoubt ? '#f59e0b' : 'var(--text-muted)',
                  background: isDoubt ? 'rgba(245,158,11,0.12)' : 'var(--bg-input)',
                  border: isDoubt ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: 99, padding: '4px 12px',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                ❓ {isDoubt ? 'Doubt ✓' : 'Doubt?'}
              </button>

              {/* Note toggle */}
              <button
                id="btn-mark-note"
                type="button"
                onClick={() => {
                  setIsNote(prev => !prev)
                  if (!isNote) setIsDoubt(false)
                }}
                disabled={submitting}
                title={isNote ? 'Remove note tag' : 'Mark as class note'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700,
                  color: isNote ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
                  background: isNote ? 'var(--brand-primary-glow)' : 'var(--bg-input)',
                  border: isNote ? '1px solid var(--brand-primary-cont)' : '1px solid var(--border-subtle)',
                  borderRadius: 99, padding: '4px 12px',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                📝 {isNote ? 'Note ✓' : 'Note?'}
              </button>
            </div>
          )}

          {/* Action row — only icons + submit, no tags */}
          <div className="create-post-actions">
            <div className="create-post-tools">
              {/* Image picker */}
              <button
                id="btn-add-image"
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!imageFile || submitting}
                title="Add image"
                aria-label="Add image"
              >
                <Icon name="image" size={20} />
              </button>

              {/* Quote Card */}
              <button
                id="btn-add-quote"
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowQuoteEditor(true)}
                disabled={submitting}
                title="Create Quote Card"
                aria-label="Create Quote Card"
                style={{ fontSize: 15 }}
              >
                ✦
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {/* Char counter */}
              <span className={`char-counter ${charsLeft <= 20 && charsLeft >= 0 ? 'warn' : ''} ${isOverLimit ? 'over' : ''}`}>
                {text.length > 0 ? charsLeft : ''}
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
        </div>
      </div>

      {/* Quote Card Editor Modal */}
      {showQuoteEditor && (
        <QuoteCardEditor
          onClose={() => setShowQuoteEditor(false)}
          onPostCreated={onPostCreated}
        />
      )}
    </>
  )
}
