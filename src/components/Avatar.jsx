/**
 * Avatar component — shows profile photo or gradient initial fallback.
 */
export default function Avatar({ src, name, size = 'md', className = '' }) {
  const initial = name ? name[0].toUpperCase() : '?'

  return (
    <div className={`avatar avatar-${size} ${className}`} aria-hidden="true">
      {src
        ? <img src={src} alt={name || 'avatar'} loading="lazy" />
        : <span>{initial}</span>
      }
    </div>
  )
}
