import { useRef } from 'react'
import { IMAGE_UPLOAD_EMPTY_CTA } from '../lib/format.js'
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
 * Единый блок: широкий баннер (удаление — корзина сверху справа) и круглый аватар (крестик сверху справа).
 * Используется в настройках гаража и лендинга детейлинга.
 */
export default function MediaBannerAvatarBlock({
  variant = 'garage',
  title = 'Баннер и аватар',
  bannerLabel = 'Баннер',
  avatarLabel = 'Аватар',
  bannerUrl = '',
  avatarUrl = '',
  onBannerUrl,
  onAvatarUrl,
  bannerEmptyHint,
  avatarEmptyHint,
  headerExtra = null,
  className = '',
}) {
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)
  const preset = PRESETS[variant] || PRESETS.garage

  const bEmpty = bannerEmptyHint || IMAGE_UPLOAD_EMPTY_CTA
  const aEmpty = avatarEmptyHint || IMAGE_UPLOAD_EMPTY_CTA

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

  return (
    <div className={`mediaHeroForm ${className}`.trim()}>
      <div className="mediaHeroForm__header">
        <div className="mediaHeroForm__title">{title}</div>
        {headerExtra}
      </div>

      <div className="mediaHeroForm__stack">
        <div className="mediaHeroForm__section">
          <div className="mediaHeroForm__sublabel">{bannerLabel}</div>
          <div className="mediaHeroForm__thumbWrap mediaHeroForm__thumbWrap--banner">
            <input ref={bannerRef} type="file" accept="image/*" className="srOnly" onChange={onBannerFile} />
            <button
              type="button"
              className="mediaHeroForm__thumb mediaHeroForm__thumb--banner"
              onClick={() => bannerRef.current?.click?.()}
              aria-label={bannerUrl ? 'Заменить баннер' : IMAGE_UPLOAD_EMPTY_CTA}
            >
              {bannerUrl ? (
                <img alt="Превью баннера" src={bannerUrl} />
              ) : (
                <span className="mediaHeroForm__thumbEmpty">{bEmpty}</span>
              )}
            </button>
            {bannerUrl ? (
              <button
                type="button"
                className="mediaHeroForm__overlayBtn mediaHeroForm__overlayBtn--banner"
                aria-label="Удалить баннер"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onBannerUrl?.('')
                }}
              >
                <span className="carPage__icon carPage__icon--trash mediaHeroForm__overlayBtnIcon" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mediaHeroForm__section">
          <div className="mediaHeroForm__sublabel">{avatarLabel}</div>
          <div className="mediaHeroForm__thumbWrap mediaHeroForm__thumbWrap--avatar">
            <input ref={avatarRef} type="file" accept="image/*" className="srOnly" onChange={onAvatarFile} />
            <button
              type="button"
              className="mediaHeroForm__thumb mediaHeroForm__thumb--avatar"
              onClick={() => avatarRef.current?.click?.()}
              aria-label={avatarUrl ? 'Заменить аватар' : IMAGE_UPLOAD_EMPTY_CTA}
            >
              {avatarUrl ? (
                <img alt="Превью аватара" src={avatarUrl} />
              ) : (
                <span className="mediaHeroForm__thumbEmpty">{aEmpty}</span>
              )}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                className="mediaHeroForm__overlayBtn mediaHeroForm__overlayBtn--avatar"
                aria-label="Удалить аватар"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAvatarUrl?.('')
                }}
              >
                <span className="carPage__icon carPage__icon--close mediaHeroForm__overlayBtnIcon" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
