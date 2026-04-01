export default function Logo({ size = 28 }) {
  const s = Number(size) || 28
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      role="img"
      aria-label="КарПас"
      style={{ flex: '0 0 auto' }}
    >
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="9"
        fill="transparent"
        stroke="color-mix(in oklab, var(--border) 85%, var(--text-h))"
        strokeWidth="1.5"
      />
      <path
        d="M11 10.2v11.6M11 16l6.2-5.8M11 16l6.2 5.8"
        fill="none"
        stroke="color-mix(in oklab, var(--text-h) 88%, var(--accent))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.6 10.2v11.6m0-5.8h2.4a2.3 2.3 0 0 0 0-4.6h-2.4"
        fill="none"
        stroke="color-mix(in oklab, var(--text-h) 88%, var(--accent))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

