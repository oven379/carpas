/**
 * Вордмарк КарПас по макету: «КАР.ПАС» — «КАР» и точка #c782ff, «ПАС» #a8a1b1;
 * под точкой — изометрический куб (верх #c4bdd4, слева #c782ff, справа #00e5be).
 * `size` — целевая высота блока (включая куб под базовой линией), px.
 */
export default function Logo({ size = 18, className = '' }) {
  const h = Number(size) || 18
  const cls = ['brandLogoMark', 'navWordmarkSvg', className].filter(Boolean).join(' ')
  return (
    <span
      className={cls}
      style={{ '--brandLogoH': `${h}px` }}
      role="img"
      aria-label="КарПас"
    >
      <span className="brandLogoMark__kar">КАР</span>
      <span className="brandLogoMark__dotCube">
        <span className="brandLogoMark__dot">.</span>
        <svg
          className="brandLogoMark__cube"
          viewBox="0 0 24 28"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <path fill="#c4bdd4" d="M12 3l8 5-8 5-8-5z" />
          <path fill="#c782ff" d="M4 8l8 5v11l-8-5V8Z" />
          <path fill="#00e5be" d="M20 8l-8 5v11l8-5V8Z" />
        </svg>
      </span>
      <span className="brandLogoMark__pas">ПАС</span>
    </span>
  )
}
