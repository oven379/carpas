/** Горизонтальный вордмарк (SVG в /public/logo.svg). `size` — высота в px, ширина подбирается по пропорции. */
export default function Logo({ size = 28 }) {
  const h = Number(size) || 28
  return (
    <span className="brandWordmarkWrap">
      <img className="brandWordmarkImg" src="/logo.svg" alt="КарПас" width={Math.round((351 / 55) * h)} height={h} decoding="async" />
    </span>
  )
}
