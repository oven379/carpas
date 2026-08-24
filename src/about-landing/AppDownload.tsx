import { IOS_APP_URL, androidApkUrl } from '../lib/appLinks.js'

function AppleGlyph() {
  // Логотип Apple, серый (как в присланной иконке).
  return (
    <svg className="al-appDlBtn__glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#7d8886"
        d="M16.365 1.43c0 1.14-.417 2.2-1.11 2.98-.79.9-2.08 1.6-3.15 1.51-.13-1.1.42-2.26 1.08-2.99.74-.83 2.05-1.46 3.18-1.5zM20.7 17.02c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.78-4.04-3.35-2.77-4.4-3.06-9.56-1.35-12.31C2.77 6.02 4.63 4.94 6.38 4.94c1.78 0 2.9 1 4.37 1 1.43 0 2.3-1 4.36-1 1.56 0 3.21.85 4.39 2.32-3.86 2.11-3.23 7.62 1.2 9.76z"
      />
    </svg>
  )
}

function AndroidGlyph() {
  // Робот Android — цветной, с контуром (как в присланной иконке).
  return (
    <svg className="al-appDlBtn__glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <g
        fill="#c6d870"
        stroke="#4c4a2e"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <line x1="8.6" y1="5.4" x2="7.3" y2="3.2" />
        <line x1="15.4" y1="5.4" x2="16.7" y2="3.2" />
        <path d="M6.8 10a5.2 5.2 0 0 1 10.4 0z" />
        <rect x="6.8" y="10.6" width="10.4" height="8.6" rx="1.4" />
        <rect x="3.9" y="11" width="2.1" height="6.6" rx="1.05" />
        <rect x="18" y="11" width="2.1" height="6.6" rx="1.05" />
        <rect x="8.5" y="18.4" width="2.1" height="3.8" rx="1.05" />
        <rect x="13.4" y="18.4" width="2.1" height="3.8" rx="1.05" />
      </g>
      <circle cx="9.7" cy="7.7" r="0.8" fill="#4c4a2e" />
      <circle cx="14.3" cy="7.7" r="0.8" fill="#4c4a2e" />
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
