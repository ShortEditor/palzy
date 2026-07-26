import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { uploadImage } from '../utils/cloudinary'
import { createPost } from '../firebase/posts'
import {
  RATIOS, RATIO_LIST, DEFAULT_RATIO,
  TEMPLATE_LIST, FONT_LIST, LAYOUT_LIST,
  renderQuoteCard, ensureFontLoaded,
} from '../utils/quoteCardRenderer'
import Icon from './Icon'
import toast from 'react-hot-toast'

const MAX_QUOTE = 200
const MAX_ATTR  = 60

export default function QuoteCardEditor({ onClose, onPostCreated }) {
  const { currentUser } = useAuth()

  const [quoteText, setQuoteText]     = useState('')
  const [attribution, setAttribution] = useState('')
  const [templateId, setTemplateId]   = useState('midnight')
  const [fontId, setFontId]           = useState('playfair')
  const [layoutId, setLayoutId]       = useState('centered')
  const [ratioId, setRatioId]         = useState(DEFAULT_RATIO)
  const [submitting, setSubmitting]   = useState(false)
  const [caption, setCaption]         = useState('')

  const canvasRef = useRef(null)
  const renderReq = useRef(null)

  const currentRatio = RATIOS[ratioId] ?? RATIOS[DEFAULT_RATIO]

  // ─── Re-render canvas whenever any input changes ──────────────
  const redraw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    await ensureFontLoaded(fontId)
    renderQuoteCard(canvas, {
      text: quoteText || 'Your quote here…',
      attribution,
      templateId,
      fontId,
      layoutId,
      ratioId,
    })
  }, [quoteText, attribution, templateId, fontId, layoutId, ratioId])

  useEffect(() => {
    if (renderReq.current) cancelAnimationFrame(renderReq.current)
    renderReq.current = requestAnimationFrame(() => { redraw() })
    return () => { if (renderReq.current) cancelAnimationFrame(renderReq.current) }
  }, [redraw])

  // ─── Export → Upload → Post ───────────────────────────────────
  async function handlePost() {
    if (!quoteText.trim()) { toast.error('Write your quote first!'); return }
    setSubmitting(true)
    try {
      const canvas = canvasRef.current
      const imageFile = await new Promise((res, rej) =>
        canvas.toBlob(b => b ? res(new File([b], 'quote.png', { type: 'image/png' })) : rej(), 'image/png')
      )
      const imageURL = await uploadImage(imageFile, 'quote-cards', currentUser.uid)
      const newPost = await createPost({
        authorId: currentUser.uid,
        content: caption.trim(),
        imageURL,
        quoteMetadata: { templateId, fontId, layoutId, ratioId, text: quoteText.trim(), attribution: attribution.trim() },
      })
      toast.success('Quote posted! ✦')
      onPostCreated?.(newPost)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Could not post quote card.')
    } finally {
      setSubmitting(false)
    }
  }

  const canPost = quoteText.trim().length > 0 && !submitting

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1200, alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-box animate-slide-up"
        style={{
          width: '100%', maxWidth: 900, maxHeight: '90dvh',
          padding: 0, overflow: 'hidden', margin: 'auto',
          display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-xl)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 16, color: 'var(--brand-primary)' }}>✦</span>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Quote Card</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        {/* Body: scrollable container */}
        <div
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
          className="quote-editor-scroll-body"
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 0, minHeight: 0 }}
            className="quote-editor-grid"
          >
            {/* ── LEFT: Canvas Preview ─────────────────────── */}
            <div style={{
              background: '#0a0a0f',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '16px 12px', gap: 'var(--space-3)', minHeight: 260,
            }}>
              {/* Ratio picker — Instagram-style pills */}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {RATIO_LIST.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRatioId(r.id)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: ratioId === r.id ? '2px solid var(--brand-primary)' : '1.5px solid rgba(255,255,255,0.15)',
                      background: ratioId === r.id ? 'var(--brand-primary)' : 'rgba(255,255,255,0.06)',
                      color: ratioId === r.id ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
                      transition: 'all var(--dur-fast)',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Canvas — aspect ratio adapts to selection */}
              <canvas
                ref={canvasRef}
                width={currentRatio.W}
                height={currentRatio.H}
                style={{
                  width: currentRatio.id === 'landscape' ? '100%' : 'auto',
                  maxWidth: currentRatio.id === 'landscape' ? '100%' : 220,
                  maxHeight: 280,
                  height: 'auto',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  display: 'block',
                }}
              />
            </div>

            {/* ── RIGHT: Controls ───────────────────────────── */}
            <div style={{
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                {/* Quote text */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Quote</span>
                    <span style={{ color: quoteText.length > MAX_QUOTE ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)' }}>
                      {quoteText.length}/{MAX_QUOTE}
                    </span>
                  </label>
                  <textarea
                    className="form-input form-textarea"
                    rows={3}
                    placeholder="The only way to do great work is to love what you do."
                    value={quoteText}
                    onChange={e => setQuoteText(e.target.value.slice(0, MAX_QUOTE))}
                    style={{ resize: 'none', fontSize: 'var(--font-size-sm)' }}
                  />
                </div>

                {/* Attribution */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attribution <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    className="form-input"
                    placeholder="Steve Jobs"
                    value={attribution}
                    onChange={e => setAttribution(e.target.value.slice(0, MAX_ATTR))}
                    style={{ fontSize: 'var(--font-size-sm)' }}
                  />
                </div>

                {/* Background templates */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Background</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                    {TEMPLATE_LIST.map(t => (
                      <TemplateSwatch key={t.id} template={t} selected={templateId === t.id} onSelect={() => setTemplateId(t.id)} />
                    ))}
                  </div>
                </div>

                {/* Font picker */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Font</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {FONT_LIST.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFontId(f.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-full)',
                          border: fontId === f.id ? '2px solid var(--brand-primary)' : '1.5px solid var(--border-normal)',
                          background: fontId === f.id ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                          color: fontId === f.id ? '#fff' : 'var(--text-secondary)',
                          fontFamily: `"${f.family}", serif`,
                          fontSize: 12, cursor: 'pointer',
                          transition: 'all var(--dur-fast)',
                          fontWeight: f.weight, fontStyle: f.style,
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout picker */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Layout</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                    {LAYOUT_LIST.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLayoutId(l.id)}
                        style={{
                          padding: 'var(--space-2) var(--space-1)',
                          borderRadius: 'var(--radius-md)',
                          border: layoutId === l.id ? '2px solid var(--brand-primary)' : '1.5px solid var(--border-normal)',
                          background: layoutId === l.id ? 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' : 'var(--bg-elevated)',
                          color: layoutId === l.id ? 'var(--brand-primary)' : 'var(--text-muted)',
                          cursor: 'pointer', fontSize: 10,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          transition: 'all var(--dur-fast)',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{l.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 600 }}>{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Caption <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea
                    className="form-input form-textarea"
                    rows={2}
                    placeholder="Add a caption to your post…"
                    value={caption}
                    onChange={e => setCaption(e.target.value.slice(0, 280))}
                    style={{ resize: 'none', fontSize: 'var(--font-size-sm)' }}
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                position: 'sticky', bottom: 0, zIndex: 10,
              }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', borderRadius: 12, padding: '10px 16px', fontWeight: 700 }}
                  onClick={handlePost}
                  disabled={!canPost}
                >
                  {submitting
                    ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Posting…</>
                    : <><span>✦</span> Post Quote Card</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

}

// ─── Template Swatch (mini canvas thumbnail) ──────────────────────────────────
function TemplateSwatch({ template, selected, onSelect }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const W = 80, H = 100
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    template.bg(ctx, W, H)
  }, [template])

  return (
    <button
      onClick={onSelect}
      title={template.name}
      style={{
        padding: 0,
        border: selected ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
        borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px var(--brand-primary)' : 'none',
        transition: 'box-shadow var(--dur-fast)',
        position: 'relative', background: 'none',
      }}
    >
      <canvas ref={canvasRef} width={80} height={100} style={{ display: 'block', width: '100%', height: 'auto' }} />
      {selected && (
        <div style={{
          position: 'absolute', top: 3, right: 3, width: 16, height: 16,
          borderRadius: '50%', background: 'var(--brand-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={9} />
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.55)', fontSize: 8, fontWeight: 600,
        color: '#fff', textAlign: 'center', padding: '2px 0', letterSpacing: '0.05em',
      }}>
        {template.name.toUpperCase()}
      </div>
    </button>
  )
}
