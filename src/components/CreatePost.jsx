import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createPost } from '../firebase/posts'
import { uploadImage } from '../utils/cloudinary'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import Avatar from './Avatar'
import Icon from './Icon'
import QuoteCardEditor from './QuoteCardEditor'
import toast from 'react-hot-toast'

const MAX_CHARS = 500   // bumped to 500 to fit links

export default function CreatePost({ onPostCreated }) {
  const { currentUser, userProfile } = useAuth()

  const [text, setText]             = useState('')
  const [imageFiles, setImageFiles] = useState([])      // File[]
  const [imagePreviews, setImagePreviews] = useState([]) // string[]
  const [imageRatio, setImageRatio] = useState('1:1')
  const [submitting, setSubmitting] = useState(false)
  const [showQuoteEditor, setShowQuoteEditor] = useState(false)
  const [isDoubt, setIsDoubt]       = useState(false)
  const [isNote, setIsNote]         = useState(false)
  const [isCollab, setIsCollab]     = useState(false)

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState(null)    // the text after @
  const [mentionStart, setMentionStart] = useState(-1)      // index in text where @ starts
  const [mentionResults, setMentionResults] = useState([])
  const [mentionLoading, setMentionLoading] = useState(false)
  const mentionDebounce = useRef(null)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Listen for "Post Vibe" sidebar button → auto-focus composer
  useEffect(() => {
    function handleFocus() {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.addEventListener('focusComposer', handleFocus)
    return () => window.removeEventListener('focusComposer', handleFocus)
  }, [])

  const MAX_IMAGES = 10
  const RATIOS = ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2']

  const charsLeft   = MAX_CHARS - text.length
  const isEmpty     = !text.trim() && imageFiles.length === 0
  const isOverLimit = text.length > MAX_CHARS

  // ── Mention search ──────────────────────────────────────────
  const searchMentions = useCallback(async (q) => {
    setMentionLoading(true)
    try {
      let snap
      if (!q) {
        // Show some users immediately when just @ is typed
        snap = await getDocs(query(collection(db, 'users'), limit(5)))
      } else {
        snap = await getDocs(query(
          collection(db, 'users'),
          where('username', '>=', q),
          where('username', '<=', q + '\uf8ff'),
          limit(6),
        ))
      }
      setMentionResults(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    } catch { setMentionResults([]) }
    finally { setMentionLoading(false) }
  }, [])

  function handleTextChange(e) {
    const newText = e.target.value
    setText(newText)

    // Detect @mention at cursor
    const cursor = e.target.selectionStart
    const before = newText.slice(0, cursor)
    const match  = before.match(/@([a-z0-9_]*)$/i)

    if (match) {
      const q = match[1].toLowerCase()
      setMentionQuery(q)
      setMentionStart(cursor - match[0].length)
      clearTimeout(mentionDebounce.current)
      mentionDebounce.current = setTimeout(() => searchMentions(q), 250)
    } else {
      setMentionQuery(null)
      setMentionResults([])
    }
  }

  function selectMention(user) {
    const cursor = textareaRef.current?.selectionStart ?? text.length
    const before = text.slice(0, mentionStart)
    const after  = text.slice(cursor)
    const newText = `${before}@${user.username} ${after}`
    setText(newText)
    setMentionQuery(null)
    setMentionResults([])
    // Restore focus + move cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionStart + user.username.length + 2 // @username + space
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  // ── File handling (multi-image) ─────────────────────────────
  function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const imageOnly = files.filter(f => f.type.startsWith('image/'))
    if (imageOnly.length !== files.length) toast.error('Only images are allowed.')

    const remaining = MAX_IMAGES - imageFiles.length
    const toAdd = imageOnly.slice(0, remaining)
    if (imageOnly.length > remaining) toast(`Max ${MAX_IMAGES} images. ${imageOnly.length - remaining} skipped.`)

    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeImage(index) {
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  function removeAllImages() {
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImageFiles([])
    setImagePreviews([])
    setImageRatio('1:1')
  }

  function handleDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const remaining = MAX_IMAGES - imageFiles.length
    const toAdd = files.slice(0, remaining)
    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && imageFiles.length === 0) { toast.error('Write something or add an image!'); return }
    if (text.length > MAX_CHARS) { toast.error('Post is too long!'); return }

    setSubmitting(true)
    try {
      // Upload all images in parallel
      let imageURL = null
      let imageURLs = null
      if (imageFiles.length > 0) {
        const urls = await Promise.all(
          imageFiles.map(f => uploadImage(f, 'posts', currentUser.uid))
        )
        if (urls.length === 1) {
          imageURL = urls[0]
        } else {
          imageURLs = urls
        }
      }

      const tags = []
      if (isDoubt)  tags.push('doubt')
      if (isNote)   tags.push('note')
      if (isCollab) tags.push('collab')

      const newPost = await createPost({
        authorId: currentUser.uid,
        content: trimmed,
        imageURL,
        imageURLs,
        imageRatio: imageFiles.length > 0 ? imageRatio : null,
        tags,
      })
      setText('')
      removeAllImages()
      setIsDoubt(false); setIsNote(false); setIsCollab(false)
      toast.success('Posted!', { icon: <Icon name="confetti" size={16} /> })
      onPostCreated?.(newPost)
    } catch (err) {
      console.error(err)
      toast.error('Could not post. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e) {
    if (mentionQuery !== null && mentionResults.length > 0) {
      // Let Escape close the dropdown
      if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]); return }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
  }

  const showTagRow = text || isDoubt || isNote || isCollab

  return (
    <>
      <div className="create-post-bar" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} id="create-post-file-input" />

        <Avatar src={userProfile?.photoURL} name={userProfile?.name} size="md" />

        <div className="create-post-input-wrap" style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            id="create-post-textarea"
            className="create-post-textarea"
            placeholder="What's on your mind? Use @username to mention"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={text ? 3 : 2}
            maxLength={MAX_CHARS + 50}
            aria-label="Write a post"
          />

          {/* ── @mention dropdown ─────────────────────────────── */}
          {mentionQuery !== null && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', maxHeight: 220,
            }}>
              {mentionLoading && (
                <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                </div>
              )}
              {!mentionLoading && mentionResults.length === 0 && (
                <div style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {mentionQuery ? 'No users found' : 'Keep typing to search…'}
                </div>
              )}
              {mentionResults.map(user => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => selectMention(user)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s', fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Avatar src={user.photoURL} name={user.name} size="sm" />
                  <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>@{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Image thumbnails strip ────────────────────────── */}
          {imagePreviews.length > 0 && (
            <>
              <div className="carousel-thumbs">
                {imagePreviews.map((src, i) => (
                  <div className="carousel-thumb" key={i}>
                    <img src={src} alt={`Image ${i + 1}`} />
                    <button
                      className="carousel-thumb-remove"
                      onClick={() => removeImage(i)}
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </div>
                ))}
                {/* Add more button */}
                {imageFiles.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flexShrink: 0, width: 72, height: 72,
                      borderRadius: 'var(--radius-md)',
                      border: '2px dashed var(--border-normal)',
                      background: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 2, color: 'var(--text-muted)',
                      transition: 'border-color 0.15s',
                    }}
                    aria-label="Add more images"
                  >
                    <Icon name="plus" size={18} />
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{imageFiles.length}/{MAX_IMAGES}</span>
                  </button>
                )}
              </div>

              {/* Aspect ratio picker */}
              <div className="ratio-picker">
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="image" size={12} /> Ratio:
                </span>
                {RATIOS.map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`ratio-pill ${imageRatio === r ? 'active' : ''}`}
                    onClick={() => setImageRatio(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Tag pills row */}
          {showTagRow && (
            <div className="create-post-tags">
              {/* Doubt toggle */}
              <button id="btn-mark-doubt" type="button"
                onClick={() => { setIsDoubt(p => !p); if (!isDoubt) { setIsNote(false); setIsCollab(false) } }}
                disabled={submitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  color: isDoubt ? '#f59e0b' : 'var(--text-muted)',
                  background: isDoubt ? 'rgba(245,158,11,0.12)' : 'var(--bg-input)',
                  border: isDoubt ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <Icon name="question" size={13} /> {isDoubt ? 'Doubt ✓' : 'Doubt?'}
              </button>

              {/* Note toggle */}
              <button id="btn-mark-note" type="button"
                onClick={() => { setIsNote(p => !p); if (!isNote) { setIsDoubt(false); setIsCollab(false) } }}
                disabled={submitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  color: isNote ? 'var(--brand-primary-cont)' : 'var(--text-muted)',
                  background: isNote ? 'var(--brand-primary-glow)' : 'var(--bg-input)',
                  border: isNote ? '1px solid var(--brand-primary-cont)' : '1px solid var(--border-subtle)',
                }}
              >
                <Icon name="document" size={13} /> {isNote ? 'Note ✓' : 'Note?'}
              </button>

              {/* Collab toggle */}
              <button id="btn-mark-collab" type="button"
                onClick={() => { setIsCollab(p => !p); if (!isCollab) { setIsDoubt(false); setIsNote(false) } }}
                disabled={submitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  color: isCollab ? '#10b981' : 'var(--text-muted)',
                  background: isCollab ? 'rgba(16,185,129,0.12)' : 'var(--bg-input)',
                  border: isCollab ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <Icon name="handshake" size={13} /> {isCollab ? 'Collab ✓' : 'Collab?'}
              </button>
            </div>
          )}

          {/* Action row */}
          <div className="create-post-actions">
            <div className="create-post-tools">
              <button id="btn-add-image" type="button" className="btn btn-ghost btn-icon" onClick={() => fileInputRef.current?.click()} disabled={imageFiles.length >= MAX_IMAGES || submitting} title={`Add images (${imageFiles.length}/${MAX_IMAGES})`} aria-label="Add images">
                <Icon name="image" size={20} />
              </button>
              <button id="btn-add-quote" type="button" className="btn btn-ghost btn-icon" onClick={() => setShowQuoteEditor(true)} disabled={submitting} title="Create Quote Card" aria-label="Create Quote Card" style={{ fontSize: 15 }}>
                <Icon name="sparkles" size={15} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className={`char-counter ${charsLeft <= 30 && charsLeft >= 0 ? 'warn' : ''} ${isOverLimit ? 'over' : ''}`}>
                {text.length > 0 ? charsLeft : ''}
              </span>
              <button id="btn-submit-post" type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isEmpty || isOverLimit || submitting} aria-label="Submit post">
                {submitting ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Posting…</> : <><Icon name="send" size={14} /> Post</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQuoteEditor && (
        <QuoteCardEditor onClose={() => setShowQuoteEditor(false)} onPostCreated={onPostCreated} />
      )}
    </>
  )
}
