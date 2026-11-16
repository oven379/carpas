import appStoreBadge from '../assets/app-store-badge.png'
import googlePlayBadge from '../assets/google-play-badge.png'
import { IOS_APP_URL, androidApkUrl } from '../lib/appLinks.js'
import { GOALS, reachGoal } from '../lib/metrika.js'

export function AppDownload({
  title = 'Мобильное приложение',
  storeBadges = false,
}: {
  title?: string | null
  storeBadges?: boolean
}) {
  return (
    <div className={storeBadges ? 'al-appDl al-appDl--storeBadges' : 'al-appDl'}>
      {title ? <p className="al-appDl__title">{title}</p> : null}
      <div className="al-appDl__grid">
        <a
          className="al-appDlBtn"
          href={IOS_APP_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => reachGoal(GOALS.appStoreClick)}
          aria-label="Скачать приложение КарПас для iOS в App Store"
        >
          {storeBadges ? (
            <span className="al-appDlBtn__ic">
              <svg viewBox="14 21 2158 618" preserveAspectRatio="none" aria-hidden="true">
                <image href={appStoreBadge} width="2195" height="662" />
              </svg>
            </span>
          ) : (
            <span className="al-appDlBtn__copy">
              <span className="al-appDlBtn__top">Скачать в</span>
              <span className="al-appDlBtn__store">App Store</span>
            </span>
          )}
        </a>
        <a
          className="al-appDlBtn"
          href={androidApkUrl()}
          onClick={() => reachGoal(GOALS.androidApkClick)}
          aria-label="Скачать приложение КарПас для Android (APK-файл)"
          title={storeBadges ? 'Скачать APK-файл для Android' : undefined}
        >
          {storeBadges ? (
            <span className="al-appDlBtn__ic">
              <svg viewBox="339 303 1070 315" preserveAspectRatio="none" aria-hidden="true">
                <image href={googlePlayBadge} width="1680" height="945" />
              </svg>
            </span>
          ) : (
            <span className="al-appDlBtn__copy">
              <span className="al-appDlBtn__top">Скачать для</span>
              <span className="al-appDlBtn__store">Android · APK</span>
            </span>
          )}
        </a>
      </div>
    </div>
  )
}
