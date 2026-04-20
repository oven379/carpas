import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, PageLoadSpinner, ServiceHint } from '../components.jsx'
import { SupportButton } from '../support/SupportHub.jsx'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerGarageAddCarHint from '../OwnerGarageAddCarHint.jsx'
import {
  displayRuPhone,
  fmtDate,
  fmtDateTime,
  fmtKm,
  normalizeHttpUrl,
  parseGarageSocialLines,
  shortExternalLinkLabel,
} from '../../lib/format.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import { VISIT_COMMENT_EMPTY_HINT } from '../../lib/visitCommentCopy.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { isGarageBannerImageVisible } from '../../lib/garageBanner.js'
import { dedupeCarsById, OWNER_MAX_FREE_GARAGE_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../../lib/supportTicketPresets.js'
import { buildCarSubRoutePath } from '../carNav.js'
import { normalizeCarEventServices, splitWashDetailingServices } from '../../lib/serviceCatalogs.js'

function pickBestDetailingId(cars, ownerClaims) {
  const score = new Map()
  for (const c of cars || []) {
    const id = String(c.detailingId || '').trim()
    if (!id) continue
    score.set(id, (score.get(id) || 0) + 1)
  }
  if (score.size === 0 && Array.isArray(ownerClaims)) {
    for (const cl of ownerClaims) {
      const id = String(cl.detailingId || '').trim()
      if (!id) continue
      score.set(id, (score.get(id) || 0) + 1)
    }
  }
  let bestId = ''
  let bestN = 0
  for (const [id, n] of score) {
    if (n > bestN) {
      bestN = n
      bestId = id
    }
  }
  return bestId
}

/** Данные сервиса для аватара в гараже: из списка авто, без /public/detailings (там только не «личные» кабинеты). */
function linkedDetailingFromCars(bestId, cars) {
  const id = String(bestId || '').trim()
  if (!id) return null
  for (const c of cars || []) {
    if (String(c?.detailingId || '').trim() !== id) continue
    return {
      id,
      name: String(c.detailingName || '').trim(),
      logo: String(c.detailingLogo || '').trim(),
    }
  }
  return { id, name: '', logo: '' }
}

function GarageLastVisitMetaRow({ visit }) {
  const showAt = Boolean(visit.at)
  const showKm = visit.mileageKm != null && visit.mileageKm !== ''
  return (
    <>
      {showAt ? <span className="garageProfileCard__lastVisitMetaDate">{fmtDate(visit.at)}</span> : null}
      {showAt && showKm ? <span aria-hidden="true"> · </span> : null}
      {showKm ? <span className="garageProfileCard__lastVisitMetaKm">{fmtKm(visit.mileageKm)}</span> : null}
    </>
  )
}

/** Одна строка визита для блока гаража (список + карточка). */
function buildGarageVisitRow(carRow, evtRaw) {
  if (!carRow || !evtRaw || evtRaw.isDraft) return null
  const e = normalizeCarEventServices(evtRaw)
  const carId = carRow.id
  const carDisplayName = [String(carRow.make || '').trim(), String(carRow.model || '').trim()]
    .filter(Boolean)
    .join(' ')
    .trim()
  const titleTrim = String(e.title || '').trim()
  const linkLabel =
    e.source === 'owner'
      ? titleTrim || 'Визит'
      : titleTrim || String(e.detailingName || '').trim() || 'Сервис'
  const headlineName = linkLabel
  const lastEvtMs = (Array.isArray(e.maintenanceServices) ? e.maintenanceServices : []).filter(Boolean)
  const { wash: lastEvtWash, other: lastEvtDet } = splitWashDetailingServices(e.services)
  const lastEvtWashF = lastEvtWash.filter(Boolean)
  const lastEvtDetF = lastEvtDet.filter(Boolean)
  const lastEvtNote = String(e.note || '').trim()
  const sortTs = Date.parse(e.at || '') || 0
  return {
    key: `${carId}:${e.id}`,
    carId,
    carDisplayName,
    eventId: e.id,
    linkLabel,
    headlineName,
    at: e.at || '',
    mileageKm: e.mileageKm,
    maintenanceServices: lastEvtMs,
    wash: lastEvtWashF,
    det: lastEvtDetF,
    note: lastEvtNote,
    sortTs,
    source: e.source === 'service' ? 'service' : 'owner',
    careTips: e.careTips,
  }
}

function GarageGlobeGlyph() {
  return (
    <svg className="garageProfileCard__iconSvg" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M3 12h18M12 3c2.5 3.5 2.5 14.5 0 18M12 3c-2.5 3.5-2.5 14.5 0 18"
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
  const [carsClaimsLoading, setCarsClaimsLoading] = useState(true)
  /** События по авто — одна загрузка на страницу (и список, и «Последний визит»), без второго раунда listEvents */
  const [enrichedRows, setEnrichedRows] = useState(null)
  const [copyHint, setCopyHint] = useState('')
  /** Все фото визита из документов (и запасной кадр из карточки авто), для раскрытой панели */
  const [visitGalleryUrls, setVisitGalleryUrls] = useState({ key: '', urls: [] })
  const [brokenGalleryUrls, setBrokenGalleryUrls] = useState([])
  /** Карточка подробностей визита: по умолчанию свёрнута, чтобы на мобилке не занимала весь экран */
  const [visitDetailsExpanded, setVisitDetailsExpanded] = useState(false)

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

  const activityAt = useMemo(() => {
    const o = owner
    if (!o?.email) return ''
    const visit = String(o.lastVisitAt || '').trim()
    if (!visit) return ''
    const ta = Date.parse(visit) || 0
    const b = o.updatedAt || o.createdAt || ''
    const tb = Date.parse(b) || 0
    return ta >= tb ? visit : b
  }, [owner])
  const activityLabel = useMemo(() => {
    const o = owner
    if (!o?.email) return ''
    const visit = String(o.lastVisitAt || '').trim()
    if (!visit) return 'Последний визит'
    const ta = Date.parse(visit) || 0
    const b = o.updatedAt || o.createdAt || ''
    const tb = Date.parse(b) || 0
    return ta >= tb ? 'Последний визит' : 'Профиль обновлён'
  }, [owner])

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
        setCarsClaimsLoading(false)
        return
      }
      setCarsClaimsLoading(true)
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
      } finally {
        if (!cancelled) setCarsClaimsLoading(false)
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
              const evtsRaw = await r.listEvents(car.id)
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

  const bestDetailingId = useMemo(() => pickBestDetailingId(cars, ownerClaims), [cars, ownerClaims])
  const linkedDetailing = useMemo(
    () => (bestDetailingId ? linkedDetailingFromCars(bestDetailingId, cars) : null),
    [bestDetailingId, cars],
  )

  const garageLastVisitLoading = !carsClaimsLoading && cars.length > 0 && enrichedRows === null

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

  /** Самый поздний визит по дате среди всех авто в гараже (= последнее обслуживание любой машины). */
  const selectedVisit = useMemo(
    () => (garageVisitsList.length ? garageVisitsList[0] : null),
    [garageVisitsList],
  )

  useEffect(() => {
    if (!selectedVisit) {
      setVisitGalleryUrls({ key: '', urls: [] })
      return
    }
    const v = selectedVisit
    /** Только документы, привязанные к этому визиту — без подстановки обложки авто (иначе «визит без фото» показывал бы баннер карточки). */
    setVisitGalleryUrls({ key: v.key, urls: [] })

    let cancelled = false
    void (async () => {
      try {
        const allDocs = await r.listDocs(v.carId)
        if (cancelled) return
        const docs = Array.isArray(allDocs) ? allDocs : []
        const forEvt = docs.filter(
          (d) => String(d.eventId || '') === String(v.eventId) && String(d.url || '').trim(),
        )
        const photoDocs = forEvt.filter((d) => String(d.kind || 'photo') === 'photo')
        const fromPhotos = photoDocs.map((d) => String(d.url || '').trim()).filter(Boolean)
        let urls = [...fromPhotos]
        if (urls.length === 0) {
          urls = forEvt.map((d) => String(d.url || '').trim()).filter(Boolean)
        }
        const seen = new Set()
        const uniq = urls.filter((u) => {
          if (seen.has(u)) return false
          seen.add(u)
          return true
        })
        setVisitGalleryUrls((prev) => (prev.key === v.key ? { key: v.key, urls: uniq } : prev))
      } catch {
        if (!cancelled) setVisitGalleryUrls((prev) => (prev.key === v.key ? { key: v.key, urls: [] } : prev))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedVisit, r])

  const visitForDisplay = useMemo(() => {
    if (!selectedVisit) return null
    const urls = visitGalleryUrls.key === selectedVisit.key ? visitGalleryUrls.urls : []
    return { ...selectedVisit, galleryPhotoUrls: urls }
  }, [selectedVisit, visitGalleryUrls])

  useEffect(() => {
    setBrokenGalleryUrls([])
  }, [selectedVisit?.key])

  useEffect(() => {
    setVisitDetailsExpanded(false)
  }, [selectedVisit?.key])

  const garageSelectedVisitHistoryHref = useMemo(
    () =>
      visitForDisplay
        ? buildCarSubRoutePath(visitForDisplay.carId, 'history', '/garage', {
            visit: String(visitForDisplay.eventId),
          })
        : '',
    [visitForDisplay],
  )

  const websiteRaw = String(owner?.garageWebsite || '').trim()
  const websiteHref = websiteRaw ? normalizeHttpUrl(owner?.garageWebsite) : ''
  const ownerSocialLinks = useMemo(() => {
    const raw = owner?.garageSocial
    if (!raw) return []
    return parseGarageSocialLines(String(raw))
      .map((line) => ({ line, href: normalizeHttpUrl(line) }))
      .filter((x) => x.href)
  }, [owner?.garageSocial])
  const profileLinkChips = useMemo(() => {
    const seen = new Set()
    const out = []
    const add = (href, title, kind) => {
      const key = String(href || '').trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      const label =
        kind === 'showcase' && slug
          ? `/g/${slug}`
          : shortExternalLinkLabel(href, title)
      out.push({
        key: `${kind}-${out.length}`,
        href,
        title: title || href,
        label,
        kind,
      })
    }
    if (websiteHref) add(websiteHref, websiteRaw, 'site')
    for (const { line, href } of ownerSocialLinks) add(href, line, 'social')
    if (publicUrl) add(publicUrl, publicUrl, 'showcase')
    return out
  }, [websiteHref, websiteRaw, ownerSocialLinks, publicUrl, slug])

  /** Соцсети из настроек; улица /g/… и сайт не дублируем (сайт — иконка глобуса выше). */
  const profileLinkChipsSocialOnly = useMemo(
    () => profileLinkChips.filter((item) => item.kind !== 'site' && item.kind !== 'showcase'),
    [profileLinkChips],
  )

  const linkOpensNewTab = useCallback((href) => {
    if (typeof window === 'undefined') return true
    try {
      return new URL(href, window.location.origin).origin !== window.location.origin
    } catch {
      return true
    }
  }, [])

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
  const pendingClaimsCount = useMemo(
    () => (Array.isArray(ownerClaims) ? ownerClaims : []).filter((x) => x?.status === 'pending').length,
    [ownerClaims],
  )
  const createFromGarageHref = '/create?from=%2Fgarage'
  const displayName = String(owner?.name || '').trim() || 'Владелец'
  const cityLine = String(owner?.garageCity || '').trim()
  const addCarPremiumBtnLabel =
    `Лимит бесплатного гаража (${OWNER_MAX_FREE_GARAGE_CARS} авто): открыть заявку на Premium`
  const { display: phoneDisplay } = displayRuPhone(owner?.phone)
  const bannerSurfaceVisible = isGarageBannerImageVisible(owner)

  const garageVisitSummaryMulti = cars.length > 1
  const garageVisitSummaryCarName = visitForDisplay ? String(visitForDisplay.carDisplayName || '').trim() : ''
  const garageVisitSummaryHasDateOrKm = Boolean(
    visitForDisplay &&
      (visitForDisplay.at ||
        (visitForDisplay.mileageKm != null && visitForDisplay.mileageKm !== '')),
  )

  return (
    <div className="container garagePage" data-carpas-garage-ui="1.0.3">
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
                <Link className="btn" data-variant="primary" to={createFromGarageHref}>
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
      {bannerSurfaceVisible ? (
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

      <Card
        className="card pad garageProfileCard"
        style={{ marginTop: bannerSurfaceVisible ? 12 : 0, marginBottom: 16 }}
      >
        <div className="garageProfileCard__top">
          <div className="garageProfileCard__main garageProfileCard__mainLead">
            <div id="owner-garage-public-hint" className="row gap wrap" style={{ alignItems: 'center' }}>
              <h1 className="garageProfileCard__h1" style={{ margin: 0 }}>
                Гараж
              </h1>
              {publicUrl ? (
                <ServiceHint scopeId="owner-garage-public-hint" variant="compact" label="Справка: публичная ссылка">
                  <p className="serviceHint__panelText">Нажмите на своё имя ниже, чтобы скопировать ссылку на улицу гостям.</p>
                </ServiceHint>
              ) : null}
            </div>
            {publicUrl ? (
              <button
                type="button"
                className="garageProfileCard__displayName garageProfileCard__displayName--action"
                onClick={() => copyPublicUrl()}
                title={`Скопировать ссылку: ${publicUrl}`}
                aria-label="Скопировать ссылку на публичную улицу"
              >
                {displayName}
              </button>
            ) : (
              <h2 className="garageProfileCard__displayName">{displayName}</h2>
            )}
            <p className="garageProfileCard__metaLine garageProfileCard__cityLine">
              <span className="garageProfileCard__metaKey">Город:</span>{' '}
              {cityLine ? cityLine : <span className="muted">нет данных</span>}
            </p>
            {copyHint ? (
              <p className="muted small garageProfileCard__copyStatus" role="status">
                {copyHint}
              </p>
            ) : null}
          </div>
          <div className="garageProfileCard__avatarCol">
            <Link
              className="garageProfileCard__avatarLink"
              to="/garage/settings"
              aria-label="Настройки гаража: аватар, баннер и контакты"
              title="Настройки гаража"
            >
              <div className="garageProfileCard__avatar">
                {owner?.garageAvatar ? (
                  <img alt="" src={resolvePublicMediaUrl(owner.garageAvatar)} />
                ) : (
                  <DefaultAvatar alt="" />
                )}
              </div>
            </Link>
            <p className="muted small garageProfileCard__avatarHint">
              Нажмите на аватар для настройки страницы.
            </p>
          </div>
          <div className="garageProfileCard__lastVisitFullRow">
            <div className="garageProfileCard__lastVisitBlock">
              {garageLastVisitLoading ? (
                <p className="muted small garageProfileCard__metaLine">
                  <span className="garageProfileCard__metaKey">История визитов:</span>{' '}
                  <PageLoadSpinner size="inline" />
                </p>
              ) : null}
              {!garageLastVisitLoading && visitForDisplay ? (
                <div className="garageProfileCard__lastVisit">
                  <p className="muted small garageProfileCard__metaLine garageProfileCard__lastVisitSummary">
                    <span className="garageProfileCard__metaKey">
                      {garageVisitSummaryMulti ? 'Последний визит в гараже' : 'Визит из истории'}:
                    </span>{' '}
                    {garageVisitSummaryMulti && garageVisitSummaryCarName ? (
                      <span className="garageProfileCard__lastVisitSummaryCar">
                        {garageVisitSummaryCarName}
                        {garageVisitSummaryHasDateOrKm ? ' — ' : ' · '}
                      </span>
                    ) : null}
                    {garageVisitSummaryHasDateOrKm ? (
                      <span className="garageProfileCard__lastVisitSummaryValues">
                        <GarageLastVisitMetaRow visit={visitForDisplay} />
                      </span>
                    ) : (
                      <span className="muted">нет даты и пробега</span>
                    )}
                  </p>
                  <div className="garageProfileCard__lastVisitToolbar garageProfileCard__lastVisitToolbar--single">
                    <button
                      type="button"
                      className="btn garageProfileCard__lastVisitToggle"
                      data-variant="outline"
                      aria-expanded={visitDetailsExpanded}
                      aria-controls="garage-last-visit-panel"
                      id="garage-last-visit-toggle"
                      onClick={() => setVisitDetailsExpanded((v) => !v)}
                    >
                      {visitDetailsExpanded ? 'Свернуть' : 'Подробнее'}
                    </button>
                  </div>
                  {visitDetailsExpanded ? (
                    <div
                      id="garage-last-visit-panel"
                      className="garageProfileCard__lastVisitPanel garageProfileCard__lastVisitPanel--expanded"
                      role="region"
                      aria-label="Подробности последнего визита"
                    >
                      <div className="garageProfileCard__lastVisitDetail">
                        <div className="garageProfileCard__lastVisitDetailVisitHead">
                          <span className="metaStrong">Последний визит:</span>
                          {visitForDisplay.at ||
                          (visitForDisplay.mileageKm != null && visitForDisplay.mileageKm !== '') ? (
                            <>
                              <span className="garageProfileCard__lastVisitDetailMetaSep" aria-hidden="true">
                                {' '}
                                ·{' '}
                              </span>
                              <GarageLastVisitMetaRow visit={visitForDisplay} />
                            </>
                          ) : (
                            <span className="garageProfileCard__lastVisitDetailMetaSep muted">
                              {' '}
                              нет даты и пробега
                            </span>
                          )}
                        </div>
                        {visitForDisplay.carDisplayName ? (
                          <div className="garageProfileCard__lastVisitDetailCar muted small">
                            <span className="eventLabel">Автомобиль:</span> {visitForDisplay.carDisplayName}
                          </div>
                        ) : null}
                        <div className="garageProfileCard__lastVisitDetailAbout">
                          <span className="eventLabel">О визите:</span>{' '}
                          <span className="garageProfileCard__lastVisitDetailHeadline">
                            {visitForDisplay.headlineName}
                          </span>
                        </div>
                        <div className="rowItem__lastEvtMeta garageProfileCard__lastVisitDetailMeta">
                          {visitForDisplay.maintenanceServices.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">ТО:</span>{' '}
                              {visitForDisplay.maintenanceServices.join(', ')}
                            </div>
                          ) : null}
                          {visitForDisplay.wash.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">Уход:</span> {visitForDisplay.wash.join(', ')}
                            </div>
                          ) : null}
                          {visitForDisplay.det.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">Детейлинг:</span> {visitForDisplay.det.join(', ')}
                            </div>
                          ) : null}
                          <div className="rowItem__lastEvtLine">
                            <span className="eventLabel">Комментарий:</span>{' '}
                            {String(visitForDisplay.note || '').trim() ? (
                              visitForDisplay.note
                            ) : (
                              <span className="muted">{VISIT_COMMENT_EMPTY_HINT}</span>
                            )}
                          </div>
                        </div>
                        {visitForDisplay.galleryPhotoUrls.length ? (
                          <div className="garageProfileCard__lastVisitPhotos" aria-label="Фото визита">
                            {visitForDisplay.galleryPhotoUrls.map((rawUrl) => {
                              const u = String(rawUrl || '').trim()
                              if (!u || brokenGalleryUrls.includes(u)) return null
                              return (
                                <img
                                  key={u}
                                  className="garageProfileCard__lastVisitDetailPhoto"
                                  alt=""
                                  src={resolvePublicMediaUrl(u)}
                                  decoding="async"
                                  loading="lazy"
                                  onError={() =>
                                    setBrokenGalleryUrls((prev) => (prev.includes(u) ? prev : [...prev, u]))
                                  }
                                />
                              )
                            })}
                          </div>
                        ) : null}
                        {garageSelectedVisitHistoryHref ? (
                          <div className="garageProfileCard__lastVisitHistoryLink">
                            <Link className="link" to={garageSelectedVisitHistoryHref}>
                              Открыть в истории
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!garageLastVisitLoading && !visitForDisplay ? (
                <p className="muted small garageProfileCard__metaLine">
                  <span className="garageProfileCard__metaKey">История визитов:</span> Пока нет записей
                </p>
              ) : null}
            </div>
          </div>
          <div className="garageProfileCard__mainTail">
            {websiteHref ? (
              <div className="garageProfileCard__iconRow" aria-label="Контакты">
                <a
                  className="garageProfileCard__iconTap garageProfileCard__iconTap--web"
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={websiteRaw}
                  aria-label={`Открыть сайт: ${websiteRaw}`}
                >
                  <GarageGlobeGlyph />
                </a>
              </div>
            ) : null}
            {!phoneDisplay && !websiteHref ? (
              <p className="muted small garageProfileCard__metaLine garageProfileCard__metaLine--spaced">
                <Link className="link" to="/garage/settings">
                  Телефон и сайт
                </Link>
                {' — в настройках.'}
              </p>
            ) : null}
            <div className="garageProfileCard__meta">
              {activityLabel === 'Профиль обновлён' ? (
                <p className="muted small garageProfileCard__metaLine">
                  <span className="garageProfileCard__metaKey">{activityLabel}:</span>{' '}
                  {fmtDateTime(activityAt) || '—'}
                </p>
              ) : null}
              {profileLinkChipsSocialOnly.length ? (
                <div className="garageProfileCard__socialOnly">
                  <div className="garageProfileCard__extraLinksRow">
                    {profileLinkChipsSocialOnly.map((item) => {
                      const ext = linkOpensNewTab(item.href)
                      return (
                        <a
                          key={item.key}
                          className="link garageProfileCard__extraLink"
                          href={item.href}
                          target={ext ? '_blank' : undefined}
                          rel={ext ? 'noopener noreferrer' : undefined}
                          title={item.title}
                        >
                          {item.label}
                          {ext ? ' ↗' : ''}
                        </a>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="garageProfileCard__footer">
          {linkedDetailing ? (
            <Link
              className="garageProfileCard__detAvatar"
              to={`/d/${encodeURIComponent(String(linkedDetailing.id))}`}
              title={String(linkedDetailing.name || '').trim() || 'Страница сервиса'}
              aria-label={
                String(linkedDetailing.name || '').trim()
                  ? `Публичная страница сервиса: ${String(linkedDetailing.name).trim()}`
                  : 'Публичная страница сервиса'
              }
            >
              {linkedDetailing.logo ? (
                <img alt="" src={resolvePublicMediaUrl(linkedDetailing.logo)} />
              ) : (
                <DefaultAvatar alt="" />
              )}
            </Link>
          ) : null}
          <div className="garageProfileCard__footerCallRow">
            <div className="garageProfileCard__addCarBlock">
              {limits.canAddManual ? (
                <Link className="btn garageProfileCard__addCarBtn" data-variant="primary" to={createFromGarageHref}>
                  Добавить авто
                </Link>
              ) : (
                <>
                  <SupportButton
                    type="button"
                    className="btn garageProfileCard__addCarBtn"
                    data-variant="primary"
                    title={addCarPremiumBtnLabel}
                    aria-label={addCarPremiumBtnLabel}
                    openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}
                  >
                    Добавить авто
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
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {cars.length ? (
          <>
            <h2 className="h2" style={{ marginBottom: 10 }}>
              Автомобили в гараже:
            </h2>
            <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/garage" cars={cars} enrichedRows={enrichedRows} />
          </>
        ) : null}
        <OwnerGarageAddCarHint
          canAddManual={limits.canAddManual}
          fromPath="/garage"
          pendingClaimsCount={pendingClaimsCount}
          style={{ marginTop: cars.length ? 16 : 0 }}
        />
      </div>
    </div>
  )
}
