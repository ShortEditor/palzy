/**
 * Blue tick verified badge — shown inline next to usernames.
 * Usage: <VerifiedBadge /> or <VerifiedBadge size={14} />
 */
export default function VerifiedBadge({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Verified"
      title="Verified account"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Filled circle background */}
      <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
      {/* Checkmark */}
      <path
        d="M6.5 12.5l3.5 3.5 7.5-8"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
