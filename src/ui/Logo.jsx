/** Горизонтальный вордмарк (SVG в /public/logo.svg). `size` — высота в px. */
export default function Logo({ size = 18 }) {
  const h = Number(size) || 18
  return (
    <span className="brandWordmarkWrap">
      <img
        className="brandWordmarkImg"
        src="/logo.svg"
        alt="КарПас"
        width={Math.round((351 / 55) * h)}
        height={h}
        decoding="async"
      />
    </span>
  )
}
