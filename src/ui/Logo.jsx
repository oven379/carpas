import brandWordmarkSrc from '../assets/brand-wordmark.svg?url'
import { BRAND_TAGLINE } from '../lib/brandConstants.js'

/**
 * Фирменный вордмарк (SVG) + слоган под ним. `tagline={false}` — только картинка (компактные блоки).
 * `size` — высота графики в px (ширина подбирается по пропорции 351:84).
 * `markWrapperClassName` — обёртка только вокруг картинки (например выравнивание по высоте кнопок 44px).
 */
export default function Logo({ size = 18, className = '', tagline = true, markWrapperClassName = '' }) {
  const h = Math.max(10, Number(size) || 18)
  const style = { '--brandLogoH': `${h}px` }
  const aria = tagline ? `КарПас. ${BRAND_TAGLINE}` : 'КарПас'

  const img = (
    <img
      src={brandWordmarkSrc}
      alt=""
      className="brandLogoLockup__img"
      style={{ height: `${h}px`, width: 'auto' }}
      decoding="async"
    />
  )

  const mark = markWrapperClassName ? <span className={markWrapperClassName}>{img}</span> : img

  if (!tagline) {
    return (
      <span
        className={['brandLogoLockup', 'brandLogoLockup--markOnly', 'navWordmarkSvg', className]
          .filter(Boolean)
          .join(' ')}
        style={style}
        role="img"
        aria-label={aria}
      >
        {mark}
      </span>
    )
  }

  return (
    <span
      className={['brandLogoLockup', 'navWordmarkSvg', className].filter(Boolean).join(' ')}
      style={style}
      role="img"
      aria-label={aria}
    >
      {mark}
      <span className="brandLogoLockup__tagline">{BRAND_TAGLINE}</span>
    </span>
  )
}
