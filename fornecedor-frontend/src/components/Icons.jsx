export function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.7 6.3a5 5 0 0 0-6.4-6L11 3 8 6 5.3 3.3a5 5 0 0 0 6.4 6L19.4 17a1.7 1.7 0 1 0 2.4-2.4l-7.1-7.1Z" />
    </svg>
  )
}

export function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="m4 4 16 16" />}
    </svg>
  )
}
