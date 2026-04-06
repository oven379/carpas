import { useRef } from 'react'
import { compressImageFile } from '../lib/imageCompression.js'
import { resolvePublicMediaUrl } from '../lib/mediaUrl.js'

const PRESETS = {
  garage: {
    banner: { maxW: 2000, maxH: 1200, quality: 0.82, maxBytes: 2.5 * 1024 * 1024 },
    avatar: { maxW: 512, maxH: 512, quality: 0.86, maxBytes: 1024 * 1024 },
  },
  detailing: {
    banner: { maxW: 1400, maxH: 700, quality: 0.82, maxBytes: 1024 * 1024 },
    avatar: { maxW: 360, maxH: 360, quality: 0.86, maxBytes: 512 * 1024 },
  },
}

/** Крестик поверх превью: квадрат — баннер/обложка, круг — аватар/логотип. */
export function MediaThumbRemoveButton({ shape, onRemove, 'aria-label': ariaLabel }) {
  return (
    <button
      type="button"
      className={`mediaRemoveBtn mediaRemoveBtn--${shape}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onRemove()
      }}
      aria-label={ariaLabel}
    >
      <svg className="mediaRemoveBtn__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          d="M6 6l12 12M18 6L6 18"
        />
      </svg>
    </button>
  )
}

/**
 * Аватар слева, баннер справа: клик по превью — выбор файла; сброс — иконка в углу превью.
 * Подписи столбцов в стиле заголовков полей (`garageSettings__mediaSublabel`).
 */
export default function MediaBannerAvatarBlock({
  variant = 'garage',
  title = '',
  bannerLabel = 'Баннер',
  avatarLabel = 'Аватар',
  bannerUrl = '',
  avatarUrl = '',
  onBannerUrl,
  onAvatarUrl,
  bannerEmptyHint = 'Нажмите — здесь будет фото вашего автомобиля',
  avatarEmptyHint = 'Нажмите для загрузки',
  bannerRemoveLabel = 'Убрать баннер',
  avatarRemoveLabel = 'Убрать аватар',
  bannerHintSlot = null,
  avatarHintSlot = null,
  headerExtra = null,
  /** Если false — колонка загрузки баннера скрыта (аватар остаётся). */
  showBannerColumn = true,
  className = '',
}) {
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)
  const preset = PRESETS[variant] || PRESETS.garage
  const bannerSrc = bannerUrl ? resolvePublicMediaUrl(bannerUrl) : ''
  const avatarSrc = avatarUrl ? resolvePublicMediaUrl(avatarUrl) : ''

  async function onBannerFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const url = await compressImageFile(f, preset.banner)
      if (url) onBannerUrl?.(url)
    } catch {
      /* ignore */
    }
  }

  async function onAvatarFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const url = await compressImageFile(f, preset.avatar)
      if (url) onAvatarUrl?.(url)
    } catch {
      /* ignore */
    }
  }

  const showHeader = Boolean((title && String(title).trim()) || headerExtra)

  return (
    <div className={`mediaBannerAvatarBlock ${className}`.trim()}>
      {showHeader ? (
        <div className="garageSettings__mediaHeadRow">
          {title ? <div className="garageSettings__mediaHeading">{title}</div> : <span style={{ flex: 1 }} />}
          {headerExtra}
        </div>
      ) : null}

      <div className="garageSettings__mediaCols">
        <div className="garageSettings__mediaCol garageSettings__mediaCol--avatar">
          <div className="garageSettings__mediaLabelRow">
            <span className="garageSettings__mediaSublabel">{avatarLabel}</span>
            {avatarHintSlot}
          </div>
          <div className="garageSettings__thumbWrap">
            <input ref={avatarRef} type="file" accept="image/*" className="srOnly" onChange={onAvatarFile} />
            <button
              type="button"
              className="garageSettings__thumb garageSettings__thumb--avatar"
              onClick={() => avatarRef.current?.click?.()}
              aria-label={avatarUrl ? `Заменить ${avatarLabel.toLowerCase()}` : `Загрузить ${avatarLabel.toLowerCase()}`}
            >
              {avatarUrl ? (
                <img alt={`Превью: ${avatarLabel}`} src={avatarSrc} />
              ) : (
                <span className="garageSettings__thumbEmpty">{avatarEmptyHint}</span>
              )}
            </button>
            {avatarUrl ? (
              <MediaThumbRemoveButton
                shape="circle"
                aria-label={avatarRemoveLabel}
                onRemove={() => onAvatarUrl?.('')}
              />
            ) : null}
          </div>
        </div>

        {showBannerColumn ? (
          <div className="garageSettings__mediaCol garageSettings__mediaCol--banner">
            <div className="garageSettings__mediaLabelRow">
              <span className="garageSettings__mediaSublabel">{bannerLabel}</span>
              {bannerHintSlot}
            </div>
            <div className="garageSettings__thumbWrap">
              <input ref={bannerRef} type="file" accept="image/*" className="srOnly" onChange={onBannerFile} />
              <button
                type="button"
                className="garageSettings__thumb garageSettings__thumb--banner"
                onClick={() => bannerRef.current?.click?.()}
                aria-label={bannerUrl ? `Заменить ${bannerLabel.toLowerCase()}` : `Загрузить ${bannerLabel.toLowerCase()}`}
              >
                {bannerUrl ? (
                  <img alt={`Превью: ${bannerLabel}`} src={bannerSrc} />
                ) : (
                  <span className="garageSettings__thumbEmpty garageSettings__thumbEmpty--banner">{bannerEmptyHint}</span>
                )}
              </button>
              {bannerUrl ? (
                <MediaThumbRemoveButton
                  shape="square"
                  aria-label={bannerRemoveLabel}
                  onRemove={() => onBannerUrl?.('')}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
