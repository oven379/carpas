import { useRef } from 'react'
import { compressImageFile } from '../lib/imageCompression.js'

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

/**
 * Аватар слева, баннер справа: клик по превью — выбор файла; «Убрать» — текстовая ссылка под превью.
 * Общий вид с настройками гаража (классы garageSettings__*).
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
  avatarRemoveLabel = 'Убрать аватар',
  bannerRemoveLabel = 'Убрать баннер',
  headerExtra = null,
  className = '',
}) {
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)
  const preset = PRESETS[variant] || PRESETS.garage

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
        <div className="garageSettings__mediaHeadRow" style={{ marginBottom: 12 }}>
          {title ? <div className="garageSettings__mediaHeading">{title}</div> : <span style={{ flex: 1 }} />}
          {headerExtra}
        </div>
      ) : null}

      <div className="garageSettings__mediaCols">
        <div className="garageSettings__mediaCol garageSettings__mediaCol--avatar">
          <div className="garageSettings__mediaSublabel">{avatarLabel}</div>
          <input ref={avatarRef} type="file" accept="image/*" className="srOnly" onChange={onAvatarFile} />
          <button
            type="button"
            className="garageSettings__thumb garageSettings__thumb--avatar"
            onClick={() => avatarRef.current?.click?.()}
            aria-label={avatarUrl ? `Заменить ${avatarLabel.toLowerCase()}` : `Загрузить ${avatarLabel.toLowerCase()}`}
          >
            {avatarUrl ? (
              <img alt={`Превью: ${avatarLabel}`} src={avatarUrl} />
            ) : (
              <span className="garageSettings__thumbEmpty">{avatarEmptyHint}</span>
            )}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              className="garageSettings__clearLink"
              onClick={(e) => {
                e.stopPropagation()
                onAvatarUrl?.('')
              }}
            >
              {avatarRemoveLabel}
            </button>
          ) : null}
        </div>

        <div className="garageSettings__mediaCol garageSettings__mediaCol--banner">
          <div className="garageSettings__mediaSublabel">{bannerLabel}</div>
          <input ref={bannerRef} type="file" accept="image/*" className="srOnly" onChange={onBannerFile} />
          <button
            type="button"
            className="garageSettings__thumb garageSettings__thumb--banner"
            onClick={() => bannerRef.current?.click?.()}
            aria-label={bannerUrl ? `Заменить ${bannerLabel.toLowerCase()}` : `Загрузить ${bannerLabel.toLowerCase()}`}
          >
            {bannerUrl ? (
              <img alt={`Превью: ${bannerLabel}`} src={bannerUrl} />
            ) : (
              <span className="garageSettings__thumbEmpty garageSettings__thumbEmpty--banner">{bannerEmptyHint}</span>
            )}
          </button>
          {bannerUrl ? (
            <button
              type="button"
              className="garageSettings__clearLink"
              onClick={(e) => {
                e.stopPropagation()
                onBannerUrl?.('')
              }}
            >
              {bannerRemoveLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
