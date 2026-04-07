import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MARKETING_LANDING_STORAGE_KEY,
  MARKETING_LANDING_UPDATED,
  readMarketingLanding,
} from '../../lib/marketingLandingDraft.js'
import { HOME_ABOUT_MAIN, HOME_ABOUT_STEPS } from '../../lib/homeLandingAboutCopy.js'
import { fmtKm } from '../../lib/format.js'
import { useRepo } from '../useRepo.js'
import { Card, PageLoadSpinner } from '../components.jsx'
import Logo from '../Logo.jsx'
import { Seo } from '../../seo/Seo.jsx'
import { HOME_META_DESCRIPTION, HOME_TITLE } from '../../seo/seoConstants.js'
import { buildHomePageJsonLd } from '../../seo/homePageJsonLd.js'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
import { BRAND_TAGLINE } from '../../lib/brandConstants.js'

const FEATURE_ITEMS = [
  'История в телефоне — детейлинг, СТО, ваши записи, фото и документы',
  'Одна история — визиты партнёра и самостоятельное обслуживание',
  'Добавление авто — сами или запрос привязки у детейлинга/СТО',
  'Фото для публичного просмотра — только с вашего согласия',
  'Советы по уходу после визита детейлинга',
  'Продажа — показ истории без пароля от кабинета',
]

function escapeCssUrl(u) {
  return String(u ?? '').replaceAll('\\', '\\\\').replaceAll('"', '%22')
}

const LANDING_GARAGE_CARDS_TIMEOUT_MS = 12_000

/** После первого ухода с главной — «О сервисе» по умолчанию свёрнуто при следующих заходах. */
const HOME_ABOUT_VISITED_KEY = 'carPass_homeLandingAboutVisited'

function readHomeAboutInitiallyOpen() {
  try {
    return localStorage.getItem(HOME_ABOUT_VISITED_KEY) !== '1'
  } catch {
    return true
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

export default function HomePage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const r = useRepo()
  const [garageCards, setGarageCards] = useState([])
  /** Только блок «Гаражи» — страницу целиком не держим за этим запросом (без API/прокси иначе «вечный» спиннер). */
  const [garagesLoading, setGaragesLoading] = useState(true)
  const [homeLandingInfoOpen, setHomeLandingInfoOpen] = useState(readHomeAboutInitiallyOpen)
  const [landing, setLanding] = useState(() => readMarketingLanding())
  const homeAboutStrictCleanupOnce = useRef(false)

  /** Явный заход по «О сервисе» — раскрыть блок и убрать state из истории. */
  useLayoutEffect(() => {
    const st = loc.state
    if (!st || typeof st !== 'object' || !st.openServiceAbout) return
    setHomeLandingInfoOpen(true)
    navigate({ pathname: loc.pathname, search: loc.search, hash: loc.hash }, { replace: true, state: {} })
  }, [loc.pathname, loc.search, loc.hash, loc.state, navigate])

  useEffect(() => {
    return () => {
      /* В dev Strict Mode первый ложный unmount не пишем в localStorage */
      if (import.meta.env.DEV && !homeAboutStrictCleanupOnce.current) {
        homeAboutStrictCleanupOnce.current = true
        return
      }
      try {
        localStorage.setItem(HOME_ABOUT_VISITED_KEY, '1')
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    let c = false
    setGaragesLoading(true)
    ;(async () => {
      try {
        const cards = await withTimeout(r.publicLandingGarageCards({ limit: 12 }), LANDING_GARAGE_CARDS_TIMEOUT_MS)
        if (!c) setGarageCards(Array.isArray(cards) ? cards : [])
      } catch {
        if (!c) setGarageCards([])
      } finally {
        if (!c) setGaragesLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [r, r._version])

  useEffect(() => {
    const sync = () => setLanding(readMarketingLanding())
    const onStorage = (e) => {
      if (e.key === MARKETING_LANDING_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(MARKETING_LANDING_UPDATED, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(MARKETING_LANDING_UPDATED, sync)
    }
  }, [])

  const homeJsonLd = useMemo(() => buildHomePageJsonLd(), [])
  const seoTitle = landing.heroTitle || HOME_TITLE
  const seoDesc = truncateMetaDescription(landing.heroLead || HOME_META_DESCRIPTION)

  const featureItems = useMemo(() => {
    const lines = String(landing.featureLines || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    return lines.length ? lines : FEATURE_ITEMS
  }, [landing.featureLines])

  const bannerPhoto = Boolean(landing.bannerImageUrl)
  const bannerStyle = bannerPhoto
    ? { '--homeBanner-img': `url("${escapeCssUrl(landing.bannerImageUrl)}")` }
    : undefined

  return (
    <div className="container homeLanding">
      <Seo title={seoTitle} description={seoDesc} canonicalPath="/" jsonLd={homeJsonLd} />

      <h1 className="srOnly">{seoTitle}</h1>

      <section
        className={`homeLandingBanner${bannerPhoto ? ' homeLandingBanner--hasPhoto' : ''}`}
        style={bannerStyle}
        aria-label="КарПас"
      >
        <div className="homeLandingBanner__inner">
          <div className="homeLandingBanner__brandStack">
            <div className="homeLandingBanner__logoRow">
              {landing.bannerLogoUrl ? (
                <img src={landing.bannerLogoUrl} alt="" className="homeLandingBanner__markImg" decoding="async" />
              ) : (
                <Logo size={72} className="homeLandingBanner__mark" />
              )}
            </div>
            <p className="homeLandingBanner__brandTagline">{BRAND_TAGLINE}</p>
          </div>
          {String(landing.bannerTagline || '').trim() ? (
            <p className="homeLandingBanner__tagline muted small">{landing.bannerTagline}</p>
          ) : null}
        </div>
      </section>

      <div className="split homeLandingSplit">
        <Card className="card pad">
          <div className="detPublicInfoCard__headRow">
            <div className="detPublicInfoCard__headMain">
              <h2 className="h2">{landing.infoSectionTitle}</h2>
              <div className="kv">
                <div className="kv__row">
                  <span className="kv__k">Назначение</span>
                  <span className="kv__v">{landing.infoPurpose}</span>
                </div>
                <div className="kv__row">
                  <span className="kv__k">Для кого</span>
                  <span className="kv__v">{landing.infoAudience}</span>
                </div>
              </div>
            </div>
            <div className="detPublicInfoCard__logoCol">
              <div
                className={`detPublicInfoCard__logo${landing.infoCardLogoUrl ? ' detPublicInfoCard__logo--homeImg' : ''}`}
                title="КарПас"
                style={
                  landing.infoCardLogoUrl
                    ? undefined
                    : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }
                }
              >
                {landing.infoCardLogoUrl ? (
                  <img src={landing.infoCardLogoUrl} alt="" className="homeLandingInfoLogoImg" decoding="async" />
                ) : (
                  <Logo size={30} />
                )}
              </div>
            </div>
          </div>

          <div className="topBorder">
            <div className="homeLandingAbout">
              <div className="homeLandingAbout__bar">
                <span className="homeLandingAbout__title">О сервисе</span>
                <button
                  type="button"
                  className="homeLandingAbout__toggle"
                  aria-expanded={homeLandingInfoOpen ? 'true' : 'false'}
                  aria-controls={homeLandingInfoOpen ? 'homeLandingAboutPanel' : undefined}
                  aria-label={
                    homeLandingInfoOpen ? 'Свернуть блок «О сервисе»' : 'Развернуть блок «О сервисе»'
                  }
                  onClick={() => setHomeLandingInfoOpen((v) => !v)}
                  title={homeLandingInfoOpen ? 'Свернуть' : 'Развернуть'}
                >
                  <span className="homeLandingAbout__toggleIcon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
              {homeLandingInfoOpen ? (
                <div className="homeLandingAboutPanel" id="homeLandingAboutPanel">
                  <p className="homeLandingAboutPanel__p homeLandingAboutPanel__lead" style={{ margin: '0 0 16px' }}>
                    {landing.heroLead}
                  </p>
                  <p className="homeLandingAboutPanel__p muted" style={{ margin: '0 0 20px' }}>
                    {HOME_ABOUT_MAIN}
                  </p>
                  <p className="homeLandingAboutPanel__label">Как это устроено</p>
                  <ul className="homeLandingAboutPanel__steps homeLandingAboutPanel__steps--bullets">
                    {HOME_ABOUT_STEPS.map((step, i) => (
                      <li key={i}>
                        {step.text}
                        {step.note ? (
                          <p className="homeLandingAboutPanel__stepNote muted small">{step.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="homeLandingAboutPanel__cta">
                    <span className="homeLandingAboutPanel__ctaHint muted small">
                      Вход, регистрация и выбор роли — в одном месте.
                    </span>
                    <Link
                      className="btn authHub__btn authHub__btn--cta homeLandingAboutPanel__ctaBtn"
                      to="/auth"
                    >
                      Вход и регистрация
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad detPublicServicesCard">
            <div className="cardTitle" style={{ marginBottom: 0 }}>
              {landing.featuresTitle}
            </div>
            <ul className="homeLandingFeatures" aria-label="Основные возможности">
              {featureItems.map((t, i) => (
                <li key={`${i}-${t.slice(0, 24)}`} className="homeLandingFeatures__item">
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card pad homeLandingStartCard">
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              {landing.startSectionTitle}
            </div>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              {landing.startSectionLead}
            </p>
            <div className="homeLandingHub homeLandingStartCard__actions">
              <Link className="btn authHub__btn authHub__btn--cta" to="/auth">
                Вход и регистрация
              </Link>
            </div>
          </Card>

          <Card className="card pad detPublicServicesCard">
            <div className="cardTitle" style={{ marginBottom: 12 }}>
              {landing.faqSectionTitle}
            </div>
            <div className="homeFaqDd">
              <details className="homeFaqDd__item">
                <summary className="carPage__recsSelect homeFaqDd__summary">
                  <span className="carPage__recsSelectLabel">Покупатель увидит всё про меня?</span>
                  <span className="carPage__recsSelectChev" aria-hidden="true" />
                </summary>
                <div className="homeFaqDd__panel muted small">
                  Нет. Посторонний видит только ту часть истории и данных, которую вы настроите для показа. Пароль и полный
                  доступ к личному кабинету не передаются.
                </div>
              </details>
              <details className="homeFaqDd__item">
                <summary className="carPage__recsSelect homeFaqDd__summary">
                  <span className="carPage__recsSelectLabel">Что именно фиксируется при визите?</span>
                  <span className="carPage__recsSelectChev" aria-hidden="true" />
                </summary>
                <div className="homeFaqDd__panel muted small">
                  Дата/время, пробег, перечень работ (мойка/осмотр/полировка и т.д.), заметки, а также фото/документы при
                  необходимости.
                </div>
              </details>
              <details className="homeFaqDd__item">
                <summary className="carPage__recsSelect homeFaqDd__summary">
                  <span className="carPage__recsSelectLabel">Нужен ли получателю пароль от моего кабинета?</span>
                  <span className="carPage__recsSelectChev" aria-hidden="true" />
                </summary>
                <div className="homeFaqDd__panel muted small">
                  Нет. Просмотр согласованного фрагмента истории не даёт входа в ваш аккаунт и не открывает весь кабинет.
                </div>
              </details>
              <details className="homeFaqDd__item">
                <summary className="carPage__recsSelect homeFaqDd__summary">
                  <span className="carPage__recsSelectLabel">Можно ли изменить, что видно посторонним?</span>
                  <span className="carPage__recsSelectChev" aria-hidden="true" />
                </summary>
                <div className="homeFaqDd__panel muted small">
                  Да. Настройки показа и согласия на фото управляются в кабинете; при необходимости доступ можно сузить или
                  обновить.
                </div>
              </details>
            </div>
          </Card>
        </div>
      </div>

      <section className="section">
        <Card className="card pad">
          <div className="row spread gap wrap" style={{ alignItems: 'center', marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>
              {landing.garagesSectionTitle}
            </h2>
            <p className="muted small" style={{ margin: 0, maxWidth: 420, lineHeight: 1.45 }}>
              {landing.garagesSectionHint}
            </p>
          </div>
          {garagesLoading ? (
            <div className="muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
              <PageLoadSpinner />
            </div>
          ) : garageCards.length ? (
            <div className="homeGarageGrid">
              {garageCards.map((c) => {
                const title = [c.make, c.model].filter(Boolean).join(' ').trim() || 'Автомобиль'
                const initials = String(c.detailingName || 'С')
                  .trim()
                  .slice(0, 1)
                  .toUpperCase()
                return (
                  <Link key={c.id} className="homeGarageCard" to={`/d/${c.detailingId}`}>
                    <div className="homeGarageCard__top">
                      <div
                        className="homeGarageCard__media"
                        style={
                          c.photo
                            ? { backgroundImage: `url("${escapeCssUrl(c.photo)}")` }
                            : undefined
                        }
                      />
                      <div
                        className={
                          c.detailingLogo
                            ? 'homeGarageCard__avatar homeGarageCard__avatar--img'
                            : 'homeGarageCard__avatar homeGarageCard__avatar--fallback'
                        }
                        title={c.detailingName || 'Сервис'}
                      >
                        {c.detailingLogo ? (
                          <img src={c.detailingLogo} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <span aria-hidden="true">{initials}</span>
                        )}
                      </div>
                    </div>
                    <div className="homeGarageCard__body">
                      <div className="homeGarageCard__title">{title}</div>
                      <div className="homeGarageCard__meta">
                        {c.year ? `${c.year}` : '—'}
                        {typeof c.mileageKm === 'number' && c.mileageKm > 0
                          ? ` · ${fmtKm(c.mileageKm)}`
                          : ''}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              Пока нет примеров с разрешёнными фото — как только появятся подходящие визиты, здесь покажем карточки.
            </p>
          )}
        </Card>
      </section>
    </div>
  )
}
