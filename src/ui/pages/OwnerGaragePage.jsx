import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, PageLoadSpinner, ServiceHint } from '../components.jsx'
import { SupportButton } from '../support/SupportHub.jsx'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerVinClaimSection from '../OwnerVinClaimSection.jsx'
import { displayRuPhone, fmtDate, fmtKm, normalizeHttpUrl } from '../../lib/format.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { isGarageBannerImageVisible } from '../../lib/garageBanner.js'
import { dedupeCarsById, OWNER_MAX_FREE_GARAGE_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../../lib/supportTicketPresets.js'
import { buildCarSubRoutePath } from '../carNav.js'
import { normalizeCarEventServices } from '../../lib/serviceCatalogs.js'

/** Одна строка визита для вкладки «Мои визиты» на странице гаража. */
function buildGarageVisitRow(carRow, evtRaw) {
  if (!carRow || !evtRaw || evtRaw.isDraft) return null
  const e = normalizeCarEventServices(evtRaw)
  const carId = carRow.id
  const carDisplayName = [String(carRow.make || '').trim(), String(carRow.model || '').trim()]
    .filter(Boolean)
    .join(' ')
    .trim()
  const titleTrim = String(e.title || '').trim()
  const headlineName =
    e.source === 'owner'
      ? titleTrim || 'Визит'
      : titleTrim || String(e.detailingName || '').trim() || 'Сервис'
  const sortTs = Date.parse(e.at || '') || 0
  return {
    key: `${carId}:${e.id}`,
    carId,
    carDisplayName,
    eventId: e.id,
    headlineName,
    at: e.at || '',
    mileageKm: e.mileageKm,
    sortTs,
  }
}

function pickBestDetailingId(cars) {
  const counts = new Map()
  for (const c of cars || []) {
    const id = String(c?.detailingId ?? '').trim()
    if (!id) continue
    counts.set(id, (counts.get(id) || 0) + 1)
  }
  let best = ''
  let bestN = 0
  for (const [id, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = id
    }
  }
  return best
}

function GarageDashPinIcon() {
  return (
    <svg className="garageDash__glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  )
}

function GarageDashPhoneIcon() {
  return (
    <svg className="garageDash__glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
      />
    </svg>
  )
}

export default function OwnerGaragePage() {
  const r = useRepo()
  const loc = useLocation()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const showSetupBanner = sp.get('from') === 'setup'
  const { owner, mode, loading } = useDetailing()

  const [cars, setCars] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])
  /** События по авто — одна загрузка на страницу (вкладка визитов и сетка), без второго listEvents */
  const [enrichedRows, setEnrichedRows] = useState(null)
  const [copyHint, setCopyHint] = useState('')
  const [garageMainTab, setGarageMainTab] = useState('cars')
  const [primaryServicePhone, setPrimaryServicePhone] = useState('')

  const slug = String(owner?.garageSlug || '').trim()
  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug) return ''
    return `${window.location.origin}/g/${slug}`
  }, [slug])

  const copyPublicUrl = useCallback(async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyHint('Ссылка скопирована')
      window.setTimeout(() => setCopyHint(''), 2200)
    } catch {
      setCopyHint('Не удалось скопировать')
      window.setTimeout(() => setCopyHint(''), 2500)
    }
  }, [publicUrl])

  const ownerEmail = String(owner?.email || '').trim()

  useEffect(() => {
    if (loc.hash !== '#garage-vin-claim') return
    const t = window.setTimeout(() => {
      document.getElementById('garage-vin-claim')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [loc.hash, loc.pathname])

  const visitPinged = useRef(false)
  useEffect(() => {
    visitPinged.current = false
  }, [ownerEmail])

  useEffect(() => {
    if (visitPinged.current || !ownerEmail || mode !== 'owner' || !r.touchOwnerLastVisit) return
    visitPinged.current = true
    void (async () => {
      try {
        const next = await Promise.resolve(r.touchOwnerLastVisit(ownerEmail))
        if (next) invalidateRepo()
      } catch {
        /* ignore */
      }
    })()
  }, [ownerEmail, mode, r])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasOwnerSession() || !ownerEmail) {
        setCars([])
        setOwnerClaims([])
        setEnrichedRows([])
        return
      }
      try {
        const [cl, claims] = await Promise.all([r.listCars(), r.listClaimsForOwner()])
        if (cancelled) return
        setCars(dedupeCarsById(Array.isArray(cl) ? cl : []))
        setOwnerClaims(Array.isArray(claims) ? claims : [])
      } catch {
        if (!cancelled) {
          setCars([])
          setOwnerClaims([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, r, r._version])

  useEffect(() => {
    let cancelled = false
    if (!ownerEmail) {
      setEnrichedRows(null)
      return () => {
        cancelled = true
      }
    }
    if (!cars.length) {
      setEnrichedRows([])
      return () => {
        cancelled = true
      }
    }
    setEnrichedRows(null)
    ;(async () => {
      try {
        const enriched = await Promise.all(
          cars.map(async (car) => {
            try {
              const evtsRaw = await r.listEvents(car.id, { scope: 'owner' })
              const evts = Array.isArray(evtsRaw) ? evtsRaw : []
              return { car, evts }
            } catch {
              return { car, evts: [] }
            }
          }),
        )
        if (!cancelled) setEnrichedRows(enriched)
      } catch {
        if (!cancelled) setEnrichedRows([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, cars, r, r._version])

  const garageVisitsList = useMemo(() => {
    if (!Array.isArray(enrichedRows) || !enrichedRows.length) return []
    const out = []
    for (const { car, evts } of enrichedRows) {
      for (const evt of evts || []) {
        const row = buildGarageVisitRow(car, evt)
        if (row) out.push(row)
      }
    }
    out.sort((a, b) => b.sortTs - a.sortTs)
    return out
  }, [enrichedRows])

  const primaryDetailingFromCars = useMemo(() => {
    const id = pickBestDetailingId(cars)
    if (!id) return null
    const sample = cars.find((c) => String(c?.detailingId ?? '').trim() === id)
    if (!sample) return null
    const name = String(sample.detailingName || '').trim()
    const logo = String(sample.detailingLogo || '').trim()
    const website = String(sample.detailingWebsite || '').trim()
    return { id, name, logo, website }
  }, [cars])

  useEffect(() => {
    const id = primaryDetailingFromCars?.id
    if (!id) {
      setPrimaryServicePhone('')
      return () => {}
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await r.publicDetailingShowcase(id)
        if (cancelled || !data?.detailing) return
        setPrimaryServicePhone(String(data.detailing.phone || '').trim())
      } catch {
        if (!cancelled) setPrimaryServicePhone('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [primaryDetailingFromCars?.id, r])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />
  if (mode === 'owner' && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!ownerEmail) return <Navigate to="/auth/owner" replace />

  const limits = ownerGarageLimits(cars, { isPremium: Boolean(owner?.isPremium) })
  const displayName = String(owner?.name || '').trim() || 'Владелец'
  const cityLine = String(owner?.garageCity || '').trim()
  const addCarPremiumBtnLabel =
    `Лимит бесплатного гаража (${OWNER_MAX_FREE_GARAGE_CARS} авто): открыть заявку на Premium`
  const { display: phoneDisplay } = displayRuPhone(owner?.phone)
  const bannerSurfaceVisible = isGarageBannerImageVisible(owner)
  const { display: servicePhoneDisplay, telHref: servicePhoneTelHref } = displayRuPhone(primaryServicePhone)
  const serviceWebsiteHref = primaryDetailingFromCars?.website
    ? normalizeHttpUrl(primaryDetailingFromCars.website)
    : ''

  const hasGarageBanner = cars.length > 0 && bannerSurfaceVisible

  return (
    <div
      className={`container garagePage${cars.length ? '' : ' garagePage--emptyOnboarding'}${
        hasGarageBanner ? ' garagePage--hasBanner' : ''
      }`}
      data-carpas-garage-ui={__APP_VERSION__}
    >
      {showSetupBanner ? (
        <Card className="card pad detPublicSetupBanner" style={{ marginBottom: 12 }}>
          <div className="row spread gap wrap" style={{ alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Настройки гаража сохранены
              </div>
              <p className="muted small" style={{ margin: '8px 0 0', maxWidth: '58ch', lineHeight: 1.5 }}>
                Витрина по ссылке <span className="mono">/g/…</span> управляется в настройках: режим «Выйти на улицу» показывает
                заполненные контакты и авто; «Остаться в гараже» закрывает страницу для гостей.
              </p>
            </div>
            <div className="row gap wrap detPublicSetupBanner__actions">
              {limits.canAddManual ? (
                <Link className="btn" data-variant="primary" to="/create">
                  Добавить автомобиль
                </Link>
              ) : (
                <SupportButton className="btn" data-variant="primary" openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}>
                  Добавить автомобиль
                </SupportButton>
              )}
              <Link className="btn" data-variant="outline" to="/garage/settings">
                Изменить улицу
              </Link>
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={() => nav('/garage', { replace: true })}
              >
                Скрыть
              </button>
            </div>
          </div>
        </Card>
      ) : null}
      {cars.length > 0 && bannerSurfaceVisible ? (
        <div
          className="detHero detHero--card garageHero"
          style={{ backgroundImage: resolvedBackgroundImageUrl(owner.garageBanner) }}
        >
          <div className="detHero__overlay detHero__overlay--card detHero__overlay--garageOwner">
            <Link
              className="btn detHero__editBtn detHero__editBtn--icon"
              data-variant="ghost"
              to="/garage/settings"
              aria-label="Настройки гаража: баннер, аватар, контакты, адрес страницы"
              title="Настройки гаража"
            >
              <span className="carPage__icon carPage__icon--edit detHero__editIcon" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}

      {cars.length > 0 ? (
        <Card
          className={`card pad garageDash${hasGarageBanner ? ' garageDash--belowBanner' : ''}`}
          style={{ marginBottom: 16 }}
        >
          <div className="garageDash__hero row spread gap wrap align-start">
            <div className="garageDash__owner row gap wrap align-start">
              <Link
                className="garageDash__avatarLink"
                to="/garage/settings"
                aria-label="Настройки гаража: аватар и контакты"
                title="Настройки гаража"
              >
                <div className="garageDash__avatar">
                  {owner?.garageAvatar ? (
                    <img alt="" src={resolvePublicMediaUrl(owner.garageAvatar)} />
                  ) : (
                    <DefaultAvatar alt="" />
                  )}
                </div>
              </Link>
              <div className="garageDash__ownerText">
                {hasGarageBanner ? (
                  <h1 className="visuallyHidden">Гараж</h1>
                ) : (
                  <div id="owner-garage-public-hint" className="row gap wrap align-center" style={{ marginBottom: 6 }}>
                    <h1 className="garageDash__garageTitle h2" style={{ margin: 0 }}>
                      Гараж
                    </h1>
                    {publicUrl ? (
                      <ServiceHint scopeId="owner-garage-public-hint" variant="compact" label="Справка: публичная ссылка">
                        <p className="serviceHint__panelText">
                          Нажмите на имя ниже, чтобы скопировать ссылку на улицу гостям.
                        </p>
                      </ServiceHint>
                    ) : null}
                  </div>
                )}
                <div
                  id={hasGarageBanner && publicUrl ? 'owner-garage-public-hint' : undefined}
                  className={`row gap wrap align-center${hasGarageBanner ? ' garageDash__nameRow' : ''}`}
                  style={hasGarageBanner ? { marginBottom: 8 } : undefined}
                >
                  {publicUrl ? (
                    <button
                      type="button"
                      className="garageDash__nameBtn"
                      onClick={() => copyPublicUrl()}
                      title={`Скопировать ссылку: ${publicUrl}`}
                      aria-label="Скопировать ссылку на публичную улицу"
                    >
                      {displayName}
                    </button>
                  ) : (
                    <h2 className="garageDash__name" style={{ margin: hasGarageBanner ? 0 : undefined }}>
                      {displayName}
                    </h2>
                  )}
                  {hasGarageBanner && publicUrl ? (
                    <ServiceHint scopeId="owner-garage-public-hint" variant="compact" label="Справка: публичная ссылка">
                      <p className="serviceHint__panelText">
                        Нажмите на имя, чтобы скопировать ссылку на улицу гостям.
                      </p>
                    </ServiceHint>
                  ) : null}
                </div>
                {copyHint ? (
                  <p className="muted small garageDash__copyHint" role="status">
                    {copyHint}
                  </p>
                ) : null}
                <div className="garageDash__line garageDash__line--muted">
                  <GarageDashPinIcon />
                  <span>{cityLine || 'Город не указан'}</span>
                </div>
                {phoneDisplay ? (
                  <div className="garageDash__line">
                    <GarageDashPhoneIcon />
                    <span className="garageDash__phoneValue">{phoneDisplay}</span>
                  </div>
                ) : (
                  <p className="muted small garageDash__line" style={{ marginTop: 4 }}>
                    <Link className="link" to="/garage/settings">
                      Указать телефон в настройках
                    </Link>
                  </p>
                )}
              </div>
            </div>

            {primaryDetailingFromCars ? (
              <Link
                className="garageDash__service"
                to={`/d/${encodeURIComponent(primaryDetailingFromCars.id)}`}
              >
                <div className="garageDash__serviceInner row gap wrap align-start">
                  <div className="garageDash__serviceLogo">
                    {primaryDetailingFromCars.logo ? (
                      <img alt="" src={resolvePublicMediaUrl(primaryDetailingFromCars.logo)} />
                    ) : (
                      <DefaultAvatar alt="" />
                    )}
                  </div>
                  <div className="garageDash__serviceBody">
                    <div className="garageDash__serviceName">
                      {primaryDetailingFromCars.name || 'Сервис'}
                    </div>
                    {servicePhoneDisplay ? (
                      <div className="garageDash__line garageDash__line--muted small">
                        <GarageDashPhoneIcon />
                        {servicePhoneTelHref ? (
                          <a className="link" href={servicePhoneTelHref}>
                            {servicePhoneDisplay}
                          </a>
                        ) : (
                          <span>{servicePhoneDisplay}</span>
                        )}
                      </div>
                    ) : serviceWebsiteHref ? (
                      <a
                        className="link muted small garageDash__serviceSite"
                        href={serviceWebsiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Сайт сервиса
                      </a>
                    ) : (
                      <span className="muted small">Публичная страница сервиса</span>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="garageDash__service garageDash__service--empty muted small">
                Привяжите авто к детейлинг-партнёру — здесь появится ваш сервис.
              </div>
            )}
          </div>

          <div className="garageDash__tabsBar row spread gap wrap align-center">
            <div className="garageDash__tabs row gap wrap" role="tablist" aria-label="Раздел гаража">
              <button
                type="button"
                role="tab"
                aria-selected={garageMainTab === 'cars'}
                className={`garageDash__tab${garageMainTab === 'cars' ? ' garageDash__tab--active' : ''}`}
                onClick={() => setGarageMainTab('cars')}
              >
                Мой гараж ({cars.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={garageMainTab === 'visits'}
                className={`garageDash__tab${garageMainTab === 'visits' ? ' garageDash__tab--active' : ''}`}
                onClick={() => setGarageMainTab('visits')}
              >
                Мои визиты ({garageVisitsList.length})
              </button>
            </div>
            <div className="garageDash__tabsActions row gap wrap align-center">
              {limits.canAddManual ? (
                <Link className="btn" data-variant="primary" to="/create">
                  + Добавить авто
                </Link>
              ) : (
                <>
                  <SupportButton
                    type="button"
                    className="btn"
                    data-variant="primary"
                    title={addCarPremiumBtnLabel}
                    aria-label={addCarPremiumBtnLabel}
                    openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}
                  >
                    + Добавить авто
                  </SupportButton>
                  <ServiceHint scopeId="owner-garage-free-limit" variant="compact" label="Справка: лимит гаража">
                    <p className="serviceHint__panelText">
                      Бесплатно в гараже — до {OWNER_MAX_FREE_GARAGE_CARS} авто. Чтобы добавить ещё одно, оформите Premium — при
                      нажатии «Добавить авто» откроется заявка в поддержку.
                    </p>
                  </ServiceHint>
                </>
              )}
            </div>
          </div>

          {garageMainTab === 'cars' ? (
            <OwnerGarageCarList
              ownerEmail={ownerEmail}
              fromPath="/garage"
              cars={cars}
              enrichedRows={enrichedRows}
              layout="grid"
            />
          ) : enrichedRows === null ? (
            <div className="muted pageLoadSpinner--centerBlock" style={{ padding: '16px 0' }}>
              <PageLoadSpinner size="compact" />
            </div>
          ) : garageVisitsList.length === 0 ? (
            <p className="muted small" style={{ marginTop: 12 }}>
              Пока нет записей в истории.
            </p>
          ) : (
            <ul className="garageDash__visitsList">
              {garageVisitsList.map((v) => {
                const href = buildCarSubRoutePath(v.carId, 'history', '/garage', { visit: String(v.eventId) })
                const metaParts = []
                if (v.at) metaParts.push(fmtDate(v.at))
                if (v.mileageKm != null && v.mileageKm !== '') metaParts.push(fmtKm(v.mileageKm))
                const meta = metaParts.join(' · ')
                return (
                  <li key={v.key} className="garageDash__visitItem">
                    <Link className="garageDash__visitLink" to={href}>
                      <span className="garageDash__visitTitle">{v.headlineName}</span>
                      <span className="muted small garageDash__visitSub">
                        {v.carDisplayName}
                        {meta ? ` · ${meta}` : ''}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : null}

      <div className={cars.length > 0 ? 'garagePage__listSection' : 'garagePage__onboarding'}>
        {!cars.length ? (
          <>
            <OwnerVinClaimSection
              ownerEmail={ownerEmail}
              cars={cars}
              ownerClaims={ownerClaims}
              sectionId="garage-vin-claim"
            />
            <div className="garagePage__emptyCta">
              <p className="garagePage__emptyCtaText">
                Добавьте свой автомобиль в гараж, чтобы начать историю Вашего автомобиля
              </p>
              <div className="garagePage__emptyCtaBtnWrap">
                {limits.canAddManual ? (
                  <Link className="btn" data-variant="primary" to="/create">
                    + Добавить авто
                  </Link>
                ) : (
                  <SupportButton
                    type="button"
                    className="btn"
                    data-variant="primary"
                    title={addCarPremiumBtnLabel}
                    aria-label={addCarPremiumBtnLabel}
                    openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}
                  >
                    + Добавить авто
                  </SupportButton>
                )}
              </div>
            </div>
          </>
        ) : (
          <OwnerVinClaimSection
            ownerEmail={ownerEmail}
            cars={cars}
            ownerClaims={ownerClaims}
            sectionId="garage-vin-claim"
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </div>
  )
}
