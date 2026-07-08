// ─── Quote Card Canvas Renderer ─────────────────────────────────────────────
// Canvas: 1080×1350 (4:5 portrait ratio)

export const CANVAS_W = 1080
export const CANVAS_H = 1350

// ─── Template Definitions ────────────────────────────────────────────────────
export const TEMPLATES = {
  midnight: {
    id: 'midnight', name: 'Midnight',
    bg: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
      g.addColorStop(0, '#0f0c29'); g.addColorStop(0.5, '#302b63'); g.addColorStop(1, '#24243e')
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.55)', accentColor: '#a78bfa',
  },
  aurora: {
    id: 'aurora', name: 'Aurora',
    bg: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
      g.addColorStop(0, '#4f46e5'); g.addColorStop(0.45, '#a855f7'); g.addColorStop(1, '#f97316')
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.6)', accentColor: '#fde68a',
  },
  forest: {
    id: 'forest', name: 'Forest',
    bg: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
      g.addColorStop(0, '#0d2b1f'); g.addColorStop(1, '#065f46')
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#ecfdf5', mutedColor: 'rgba(236,253,245,0.55)', accentColor: '#34d399',
  },
  ember: {
    id: 'ember', name: 'Ember',
    bg: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
      g.addColorStop(0, '#450a0a'); g.addColorStop(1, '#c2410c')
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#fff7ed', mutedColor: 'rgba(255,247,237,0.55)', accentColor: '#fb923c',
  },
  slate: {
    id: 'slate', name: 'Slate',
    bg: (ctx) => {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1
      for (let x = 0; x < CANVAS_W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke() }
      for (let y = 0; y < CANVAS_H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }
    },
    textColor: '#f1f5f9', mutedColor: 'rgba(241,245,249,0.45)', accentColor: '#7c3aed',
  },
  ivory: {
    id: 'ivory', name: 'Ivory',
    bg: (ctx) => {
      ctx.fillStyle = '#faf7f2'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // thin border frame
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 3
      ctx.strokeRect(36, 36, CANVAS_W - 72, CANVAS_H - 72)
    },
    textColor: '#1c1917', mutedColor: 'rgba(28,25,23,0.45)', accentColor: '#7c3aed',
  },
  cosmos: {
    id: 'cosmos', name: 'Cosmos',
    bg: (ctx) => {
      ctx.fillStyle = '#1a0533'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // draw star-like dots
      const rng = mulberry32(42)
      for (let i = 0; i < 180; i++) {
        const x = rng() * CANVAS_W, y = rng() * CANVAS_H
        const r = rng() * 2 + 0.5
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${rng() * 0.4 + 0.1})`; ctx.fill()
      }
      // soft vignette radial
      const vg = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, 200, CANVAS_W/2, CANVAS_H/2, CANVAS_W * 0.9)
      vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(10,0,20,0.6)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#f5f0ff', mutedColor: 'rgba(245,240,255,0.5)', accentColor: '#e879f9',
  },
  rose: {
    id: 'rose', name: 'Rose',
    bg: (ctx) => {
      const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
      g.addColorStop(0, '#4a1232'); g.addColorStop(1, '#9f1239')
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    },
    textColor: '#fff1f2', mutedColor: 'rgba(255,241,242,0.55)', accentColor: '#fb7185',
  },
}

export const TEMPLATE_LIST = Object.values(TEMPLATES)

// ─── Font Definitions ────────────────────────────────────────────────────────
export const FONTS = {
  playfair:   { id: 'playfair',   name: 'Playfair',  family: 'Playfair Display', weight: '700', style: 'normal' },
  inter_bold: { id: 'inter_bold', name: 'Bold Sans',  family: 'Inter',            weight: '800', style: 'normal' },
  lora:       { id: 'lora',       name: 'Lora',       family: 'Lora',             weight: '400', style: 'italic' },
  space_mono: { id: 'space_mono', name: 'Mono',       family: 'Space Mono',       weight: '400', style: 'normal' },
  dancing:    { id: 'dancing',    name: 'Script',     family: 'Dancing Script',   weight: '600', style: 'normal' },
}
export const FONT_LIST = Object.values(FONTS)

// ─── Layout Definitions ──────────────────────────────────────────────────────
export const LAYOUTS = {
  centered:    { id: 'centered',    name: 'Centered',    icon: '⊡' },
  bottom_attr: { id: 'bottom_attr', name: 'Bottom Name', icon: '⊟' },
  top_quote:   { id: 'top_quote',   name: 'Quote Mark',  icon: '❝' },
  minimal:     { id: 'minimal',     name: 'Minimal',     icon: '⊠' },
}
export const LAYOUT_LIST = Object.values(LAYOUTS)

// ─── Seeded RNG (for deterministic stars) ────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Font Loader ─────────────────────────────────────────────────────────────
const loadedFonts = new Set()
export async function ensureFontLoaded(fontId) {
  if (loadedFonts.has(fontId)) return
  const def = FONTS[fontId]
  if (!def || def.family === 'Inter') { loadedFonts.add(fontId); return }
  try {
    await document.fonts.ready
    const spec = `${def.style === 'italic' ? 'italic ' : ''}${def.weight} 40px "${def.family}"`
    await document.fonts.load(spec)
    loadedFonts.add(fontId)
  } catch (e) {
    console.warn('Font load failed for', fontId, e)
  }
}

// ─── Text Wrapping with Auto-Size ────────────────────────────────────────────
function measureAndWrap(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current); current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function autoSizeFont(ctx, text, maxWidth, maxHeight, fontStr, maxPx = 80, minPx = 24, step = 4) {
  let size = maxPx
  while (size >= minPx) {
    ctx.font = fontStr.replace('__SIZE__', size)
    const lines = measureAndWrap(ctx, text, maxWidth)
    const totalH = lines.length * size * 1.45
    if (totalH <= maxHeight) return { size, lines }
    size -= step
  }
  ctx.font = fontStr.replace('__SIZE__', minPx)
  return { size: minPx, lines: measureAndWrap(ctx, text, maxWidth) }
}

// ─── Main Render Function ─────────────────────────────────────────────────────
export function renderQuoteCard(canvas, { text, attribution, templateId, fontId, layoutId }) {
  const tmpl   = TEMPLATES[templateId]   ?? TEMPLATES.midnight
  const font   = FONTS[fontId]           ?? FONTS.playfair
  const layout = LAYOUTS[layoutId]       ?? LAYOUTS.centered

  const ctx = canvas.getContext('2d')
  canvas.width  = CANVAS_W
  canvas.height = CANVAS_H
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // 1. Draw background
  tmpl.bg(ctx)

  const PAD    = 100
  const inner  = CANVAS_W - PAD * 2

  const fontBase = `${font.style === 'italic' ? 'italic ' : ''}__SIZE__px "${font.family}", serif`

  if (layout.id === 'centered') {
    _drawCentered(ctx, text, attribution, tmpl, fontBase, inner, PAD)
  } else if (layout.id === 'bottom_attr') {
    _drawBottomAttr(ctx, text, attribution, tmpl, fontBase, inner, PAD)
  } else if (layout.id === 'top_quote') {
    _drawTopQuote(ctx, text, attribution, tmpl, fontBase, inner, PAD)
  } else if (layout.id === 'minimal') {
    _drawMinimal(ctx, text, attribution, tmpl, fontBase, inner, PAD)
  }

  // Watermark
  ctx.font = `500 28px "Inter", sans-serif`
  ctx.fillStyle = tmpl.mutedColor
  ctx.textAlign = 'center'
  ctx.fillText('palzy', CANVAS_W / 2, CANVAS_H - 48)
}

// ─── Layout Drawers ───────────────────────────────────────────────────────────
function _drawCentered(ctx, text, attribution, tmpl, fontBase, inner, PAD) {
  const maxH = CANVAS_H * 0.6
  const { size, lines } = autoSizeFont(ctx, text, inner, maxH, fontBase)
  const lh = size * 1.45
  const totalH = lines.length * lh
  let y = (CANVAS_H - totalH) / 2

  ctx.textAlign = 'center'
  ctx.fillStyle = tmpl.textColor
  for (const line of lines) {
    ctx.font = fontBase.replace('__SIZE__', size)
    ctx.fillText(line, CANVAS_W / 2, y + size)
    y += lh
  }

  if (attribution) {
    ctx.font = `500 36px "Inter", sans-serif`
    ctx.fillStyle = tmpl.mutedColor
    ctx.fillText(`— ${attribution}`, CANVAS_W / 2, y + 60)
  }
}

function _drawBottomAttr(ctx, text, attribution, tmpl, fontBase, inner, PAD) {
  const maxH = CANVAS_H * 0.55
  const { size, lines } = autoSizeFont(ctx, text, inner, maxH, fontBase)
  const lh = size * 1.45

  let y = PAD + 80
  ctx.textAlign = 'left'
  ctx.fillStyle = tmpl.textColor
  for (const line of lines) {
    ctx.font = fontBase.replace('__SIZE__', size)
    ctx.fillText(line, PAD, y + size)
    y += lh
  }

  if (attribution) {
    ctx.font = `500 34px "Inter", sans-serif`
    ctx.fillStyle = tmpl.accentColor
    ctx.textAlign = 'right'
    ctx.fillText(`— ${attribution}`, CANVAS_W - PAD, CANVAS_H - PAD - 60)
  }
}

function _drawTopQuote(ctx, text, attribution, tmpl, fontBase, inner, PAD) {
  // Big decorative quote mark
  ctx.font = `bold 280px "Playfair Display", serif`
  ctx.fillStyle = tmpl.accentColor
  ctx.globalAlpha = 0.18
  ctx.textAlign = 'left'
  ctx.fillText('\u201C', PAD - 20, PAD + 220)
  ctx.globalAlpha = 1

  const maxH = CANVAS_H * 0.5
  const { size, lines } = autoSizeFont(ctx, text, inner, maxH, fontBase, 72)
  const lh = size * 1.45

  let y = PAD + 240
  ctx.textAlign = 'center'
  ctx.fillStyle = tmpl.textColor
  for (const line of lines) {
    ctx.font = fontBase.replace('__SIZE__', size)
    ctx.fillText(line, CANVAS_W / 2, y + size)
    y += lh
  }

  if (attribution) {
    // accent line
    ctx.fillStyle = tmpl.accentColor
    ctx.fillRect(CANVAS_W / 2 - 40, y + 50, 80, 3)
    ctx.font = `600 36px "Inter", sans-serif`
    ctx.fillStyle = tmpl.mutedColor
    ctx.textAlign = 'center'
    ctx.fillText(attribution.toUpperCase(), CANVAS_W / 2, y + 110)
  }
}

function _drawMinimal(ctx, text, attribution, tmpl, fontBase, inner, PAD) {
  // Corner accent bar
  ctx.fillStyle = tmpl.accentColor
  ctx.fillRect(PAD, PAD, 6, 120)

  const maxH = CANVAS_H * 0.55
  const { size, lines } = autoSizeFont(ctx, text, inner, maxH, fontBase)
  const lh = size * 1.45

  let y = PAD + 160
  ctx.textAlign = 'left'
  ctx.fillStyle = tmpl.textColor
  for (const line of lines) {
    ctx.font = fontBase.replace('__SIZE__', size)
    ctx.fillText(line, PAD + 18, y + size)
    y += lh
  }

  if (attribution) {
    ctx.font = `400 32px "Inter", sans-serif`
    ctx.fillStyle = tmpl.mutedColor
    ctx.textAlign = 'left'
    ctx.fillText(`— ${attribution}`, PAD + 18, y + 70)
  }
}
