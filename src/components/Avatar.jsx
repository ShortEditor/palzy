/**
 * Avatar component — shows profile photo or gradient initial fallback.
 * Supports both standard size classes ('sm', 'md', 'lg', 'xl', '2xl')
 * and custom numeric sizes (e.g. 38, 54, 56).
 */
export default function Avatar({ src, name, size = 'md', className = '' }) {
  const initial = name ? name[0].toUpperCase() : '?'

  const isClassSize = ['sm', 'md', 'lg', 'xl', '2xl'].includes(size)
  const sizeStyle = isClassSize ? {} : {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    fontSize: typeof size === 'number' ? `${Math.round(size * 0.4)}px` : undefined,
  }

  return (
    <div
      className={`avatar ${isClassSize ? `avatar-${size}` : ''} ${className}`}
      style={sizeStyle}
      aria-hidden="true"
    >
      {src
        ? <img src={src} alt={name || 'avatar'} loading="lazy" />
        : <span>{initial}</span>
      }
    </div>
  )
}
