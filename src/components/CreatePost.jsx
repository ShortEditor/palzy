import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createPost } from '../firebase/posts'
import { uploadImage } from '../utils/cloudinary'
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import Avatar from './Avatar'
import Icon from './Icon'
import QuoteCardEditor from './QuoteCardEditor'
import toast from 'react-hot-toast'

const MAX_CHARS = 500   // bumped to 500 to fit links

export default function CreatePost({ onPostCreated }) {
  const { currentUser, userProfile } = useAuth()

  const [text, setText]             = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
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

  const charsLeft   = MAX_CHARS - text.length
  const isEmpty     = !text.trim() && !imageFile
  const isOverLimit = text.length > MAX_CHARS

  // ── Mention search ──────────────────────────────────────────
  const searchMentions = useCallback(async (q) => {
    if (!q) { setMentionResults([]); return }
    setMentionLoading(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'users'),
        where('username', '>=', q),
        where('username', '<=', q + '\uf8ff'),
        limit(6),
      ))
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

  // ── File handling ───────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function removeImage() { setImageFile(null); setImagePreview(null) }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageFile) { toast.error('Write something or add an image!'); return }
    if (text.length > MAX_CHARS) { toast.error('Post is too long!'); return }

    setSubmitting(true)
    try {
      let imageURL = null
      if (imageFile) imageURL = await uploadImage(imageFile, 'posts', currentUser.uid)

      const tags = []
      if (isDoubt)  tags.push('doubt')
      if (isNote)   tags.push('note')
      if (isCollab) tags.push('collab')

      const newPost = await createPost({ authorId: currentUser.uid, content: trimmed, imageURL, tags })
      setText('')
      removeImage()
      setIsDoubt(false); setIsNote(false); setIsCollab(false)
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
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} id="create-post-file-input" />

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
              {!mentionLoading && mentionResults.length === 0 && mentionQuery.length > 0 && (
                <div style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No users found
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

          {/* Image preview */}
          {imagePreview && (
            <div className="image-preview-wrap">
              <img src={imagePreview} alt="Selected image preview" />
              <button className="image-preview-remove" onClick={removeImage} aria-label="Remove image" type="button">✕</button>
            </div>
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
                ❓ {isDoubt ? 'Doubt ✓' : 'Doubt?'}
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
                📝 {isNote ? 'Note ✓' : 'Note?'}
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
                🤝 {isCollab ? 'Collab ✓' : 'Collab?'}
              </button>
            </div>
          )}

          {/* Action row */}
          <div className="create-post-actions">
            <div className="create-post-tools">
              <button id="btn-add-image" type="button" className="btn btn-ghost btn-icon" onClick={() => fileInputRef.current?.click()} disabled={!!imageFile || submitting} title="Add image" aria-label="Add image">
                <Icon name="image" size={20} />
              </button>
              <button id="btn-add-quote" type="button" className="btn btn-ghost btn-icon" onClick={() => setShowQuoteEditor(true)} disabled={submitting} title="Create Quote Card" aria-label="Create Quote Card" style={{ fontSize: 15 }}>
                ✦
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
