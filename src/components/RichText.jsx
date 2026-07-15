import { Link } from 'react-router-dom'

/**
 * Renders post/comment text with:
 * - Clickable @mentions → /u/username
 * - Clickable https:// links → external tab
 * - Plain text as-is
 */

// Matches https:// URLs and @username mentions
const SEGMENT_RE = /(https?:\/\/[^\s<>"',]+|@[a-z0-9_]{1,20})/gi

export default function RichText({ text, className = '', style = {} }) {
  if (!text) return null

  const segments = []
  let lastIndex = 0
  let match

  SEGMENT_RE.lastIndex = 0
  while ((match = SEGMENT_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    const value = match[0]
    if (value.startsWith('@')) {
      segments.push({ type: 'mention', username: value.slice(1), content: value })
    } else {
      segments.push({ type: 'url', url: value, content: value })
    }
    lastIndex = match.index + value.length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }}>
      {segments.map((seg, i) => {
        if (seg.type === 'mention') {
          return (
            <Link
              key={i}
              to={`/u/${seg.username}`}
              style={{ color: 'var(--brand-primary-cont)', fontWeight: 600, textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              {seg.content}
            </Link>
          )
        }
        if (seg.type === 'url') {
          const display = seg.url.replace(/^https?:\/\//, '').slice(0, 42)
          return (
            <a
              key={i}
              href={seg.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--brand-accent)', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              🔗 {display}{seg.url.length > 45 ? '…' : ''}
            </a>
          )
        }
        return <span key={i}>{seg.content}</span>
      })}
    </p>
  )
}
