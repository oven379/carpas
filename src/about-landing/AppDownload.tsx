import { IOS_APP_URL, androidApkUrl } from '../lib/appLinks.js'

function AppleGlyph() {
  return (
    <svg className="al-appDlBtn__glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.417 2.2-1.11 2.98-.79.9-2.08 1.6-3.15 1.51-.13-1.1.42-2.26 1.08-2.99.74-.83 2.05-1.46 3.18-1.5zM20.7 17.02c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.78-4.04-3.35-2.77-4.4-3.06-9.56-1.35-12.31C2.77 6.02 4.63 4.94 6.38 4.94c1.78 0 2.9 1 4.37 1 1.43 0 2.3-1 4.36-1 1.56 0 3.21.85 4.39 2.32-3.86 2.11-3.23 7.62 1.2 9.76z"
      />
    </svg>
  )
}

function AndroidGlyph() {
  return (
    <svg className="al-appDlBtn__glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.6 9.48l1.84-3.18a.4.4 0 10-.7-.4l-1.86 3.23a11.4 11.4 0 00-9.76 0L5.26 5.9a.4.4 0 10-.7.4L6.4 9.48A10.8 10.8 0 001 18.14h22a10.8 10.8 0 00-5.4-8.66zM7 15.25a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1zm10 0a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1z"
      />
    </svg>
  )
}

export function AppDownload({ title = 'Мобильное приложение' }: { title?: string | null }) {
  return (
    <div className="al-appDl">
      {title ? <p className="al-appDl__title">{title}</p> : null}
      <div className="al-appDl__grid">
        <a
          className="al-appDlBtn"
          href={IOS_APP_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Скачать приложение КарПас для iOS в App Store"
        >
          <span className="al-appDlBtn__ic">
            <AppleGlyph />
          </span>
          <span className="al-appDlBtn__copy">
            <span className="al-appDlBtn__top">Скачать в</span>
            <span className="al-appDlBtn__store">App Store</span>
          </span>
        </a>
        <a
          className="al-appDlBtn"
          href={androidApkUrl()}
          aria-label="Скачать приложение КарПас для Android (APK-файл)"
        >
          <span className="al-appDlBtn__ic">
            <AndroidGlyph />
          </span>
          <span className="al-appDlBtn__copy">
            <span className="al-appDlBtn__top">Скачать для</span>
            <span className="al-appDlBtn__store">Android · APK</span>
          </span>
        </a>
      </div>
    </div>
  )
}
