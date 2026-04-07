import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, HeroCoverStat, PageLoadSpinner, ServiceHint } from '../components.jsx'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerVinClaimSection from '../OwnerVinClaimSection.jsx'
import {
  displayRuPhone,
  fmtDateTime,
  fmtKm,
  normalizeHttpUrl,
  parseGarageSocialLines,
  shortExternalLinkLabel,
} from '../../lib/format.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { isGarageBannerImageVisible } from '../../lib/garageBanner.js'
import {
  dedupeCarsById,
  OWNER_MAX_MANUAL_CARS,
  OWNER_MAX_TOTAL_CARS,
  ownerGarageLimits,
} from '../../lib/garageLimits.js'
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
      {showAt ? <span className="eventMeta__when">{fmtDateTime(visit.at)}</span> : null}
      {showAt && showKm ? <span aria-hidden="true"> · </span> : null}
      {showKm ? <span className="eventMeta__km">{fmtKm(visit.mileageKm)}</span> : null}
    </>
  )
}

function GaragePhoneGlyph() {
  return (
    <svg className="garageProfileCard__iconSvg" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1 17 17 0 01-18.56-18.56 1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.2 2.2z"
      />
    </svg>
  )
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
  const [listBusy, setListBusy] = useState(true)
  const [copyHint, setCopyHint] = useState('')
  /** Последний сохранённый визит по любому авто гаража (не черновик), для строки «Последний визит» в профиле */
  const [garageLastVisit, setGarageLastVisit] = useState(null)
  const [garageLastVisitLoading, setGarageLastVisitLoading] = useState(false)
  const [lastVisitThumbBroken, setLastVisitThumbBroken] = useState(false)

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
        setListBusy(false)
        return
      }
      setListBusy(true)
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
        if (!cancelled) setListBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, r, r._version])

  const bestDetailingId = useMemo(() => pickBestDetailingId(cars, ownerClaims), [cars, ownerClaims])
  const linkedDetailing = useMemo(
    () => (bestDetailingId ? linkedDetailingFromCars(bestDetailingId, cars) : null),
    [bestDetailingId, cars],
  )

  useEffect(() => {
    let cancelled = false
    if (!ownerEmail || !cars.length) {
      setGarageLastVisit(null)
      setGarageLastVisitLoading(false)
      return () => {
        cancelled = true
      }
    }
    setGarageLastVisitLoading(true)
    ;(async () => {
      try {
        let best = null
        for (const c of cars) {
          const evtsRaw = await r.listEvents(c.id)
          const evts = Array.isArray(evtsRaw) ? evtsRaw : []
          for (const e of evts) {
            if (e?.isDraft) continue
            const t = Date.parse(e?.at || '') || 0
            if (!best || t >= best.ts) best = { carId: c.id, evt: e, ts: t, carEvents: evts }
          }
        }
        if (cancelled) return
        if (!best) {
          setGarageLastVisit(null)
          return
        }
        const carRow = cars.find((c) => String(c?.id ?? '') === String(best.carId))
        const carDisplayName = carRow
          ? [String(carRow.make || '').trim(), String(carRow.model || '').trim()].filter(Boolean).join(' ').trim()
          : ''
        const e = normalizeCarEventServices(best.evt)
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
        let photoUrl = ''
        try {
          const allDocs = await r.listDocs(best.carId)
          const docs = Array.isArray(allDocs) ? allDocs : []
          const forEvt = docs.filter((d) => String(d.eventId || '') === String(e.id) && String(d.url || '').trim())
          const photoDocs = forEvt.filter((d) => String(d.kind || 'photo') === 'photo')
          const pick = photoDocs[0] || forEvt[0]
          photoUrl = String(pick?.url || '').trim()
        } catch {
          photoUrl = ''
        }
        if (cancelled) return
        setGarageLastVisit({
          carId: best.carId,
          carDisplayName,
          eventId: e.id,
          linkLabel,
          headlineName,
          at: e.at || '',
          mileageKm: e.mileageKm,
          photoUrl,
          maintenanceServices: lastEvtMs,
          wash: lastEvtWashF,
          det: lastEvtDetF,
          note: lastEvtNote,
        })
      } catch {
        if (!cancelled) setGarageLastVisit(null)
      } finally {
        if (!cancelled) setGarageLastVisitLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, cars, r, r._version])

  useEffect(() => {
    setLastVisitThumbBroken(false)
  }, [garageLastVisit?.eventId, garageLastVisit?.photoUrl])

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
  if (listBusy) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  const limits = ownerGarageLimits(cars)
  const displayName = String(owner?.name || '').trim() || ownerEmail
  const cityLine = String(owner?.garageCity || '').trim()
  const garageCarStatTitle = `${cars.length} ${
    cars.length === 1 ? 'автомобиль' : cars.length < 5 ? 'автомобиля' : 'автомобилей'
  } в гараже`
  const addCarLimitTitle =
    limits.totalCount >= OWNER_MAX_TOTAL_CARS
      ? `В гараже не больше ${OWNER_MAX_TOTAL_CARS} автомобилей`
      : `Вручную не больше ${OWNER_MAX_MANUAL_CARS} авто — остальное через «Найти авто по VIN» в сервисе`
  const { display: phoneDisplay, telHref: phoneTelHref } = displayRuPhone(owner?.phone)
  const bannerSurfaceVisible = isGarageBannerImageVisible(owner)

  return (
    <div className="container garagePage">
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
              <Link className="btn" data-variant="primary" to="/create">
                Добавить автомобиль
              </Link>
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
          <div className="garageProfileCard__main">
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
            {copyHint ? (
              <p className="muted small garageProfileCard__copyStatus" role="status">
                {copyHint}
              </p>
            ) : null}
            <p className="garageProfileCard__metaLine garageProfileCard__cityLine">
              <span className="garageProfileCard__metaKey">Город:</span>{' '}
              {cityLine || (
                <>
                  не указан —{' '}
                  <Link className="link" to="/garage/settings">
                    настройки
                  </Link>
                </>
              )}
            </p>
            <div className="garageProfileCard__iconRow" aria-label="Контакты">
              {phoneTelHref ? (
                <a
                  className="garageProfileCard__iconTap"
                  href={phoneTelHref}
                  title={phoneDisplay}
                  aria-label={`Позвонить: ${phoneDisplay}`}
                >
                  <GaragePhoneGlyph />
                </a>
              ) : phoneDisplay ? (
                <span
                  className="garageProfileCard__iconTap garageProfileCard__iconTap--disabled"
                  title={`${phoneDisplay} — полный номер для звонка в настройках`}
                  aria-hidden="true"
                >
                  <GaragePhoneGlyph />
                </span>
              ) : null}
              {websiteHref ? (
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
              ) : null}
            </div>
            {!phoneDisplay && !websiteHref ? (
              <p className="muted small garageProfileCard__metaLine garageProfileCard__metaLine--spaced">
                <Link className="link" to="/garage/settings">
                  Телефон и сайт
                </Link>
                {' — в настройках.'}
              </p>
            ) : null}
            <div className="garageProfileCard__meta">
              {garageLastVisitLoading ? (
                <p className="muted small garageProfileCard__metaLine">
                  <span className="garageProfileCard__metaKey">Последний визит:</span>{' '}
                  <PageLoadSpinner size="inline" />
                </p>
              ) : null}
              {!garageLastVisitLoading && garageLastVisit ? (
                <div className="garageProfileCard__lastVisit">
                  <Link
                    className="garageProfileCard__lastVisitHit"
                    to={buildCarSubRoutePath(garageLastVisit.carId, 'history', '/garage', {
                      visit: String(garageLastVisit.eventId),
                    })}
                    aria-label={`Открыть визит: ${garageLastVisit.headlineName}`}
                  >
                    <div className="garageProfileCard__lastVisitHead">
                      <div className="garageProfileCard__lastVisitLead">
                        <span className="garageProfileCard__lastVisitLeadLabel">Последний визит:</span>
                        {garageLastVisit.carDisplayName ? (
                          <>
                            {' '}
                            <span className="garageProfileCard__lastVisitLeadCar">
                              {garageLastVisit.carDisplayName}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {garageLastVisit.at ||
                      (garageLastVisit.mileageKm != null && garageLastVisit.mileageKm !== '') ? (
                        <div className="garageProfileCard__lastVisitMeta">
                          <GarageLastVisitMetaRow visit={garageLastVisit} />
                        </div>
                      ) : null}
                    </div>
                    <div className="rowItem__lastEvt">
                      <div className="rowItem__lastEvtTop">
                        {garageLastVisit.photoUrl && !lastVisitThumbBroken ? (
                          <img
                            className="rowItem__lastEvtPhoto rowItem__lastEvtPhoto--img"
                            alt=""
                            src={resolvePublicMediaUrl(garageLastVisit.photoUrl)}
                            decoding="async"
                            onError={() => setLastVisitThumbBroken(true)}
                          />
                        ) : null}
                        <div className="rowItem__lastEvtText">
                          <div className="rowItem__lastEvtName">{garageLastVisit.headlineName}</div>
                        </div>
                      </div>
                      <div className="rowItem__lastEvtMeta">
                        {garageLastVisit.maintenanceServices.length ? (
                          <div className="rowItem__lastEvtLine">
                            <span className="eventLabel">ТО:</span> {garageLastVisit.maintenanceServices.join(', ')}
                          </div>
                        ) : null}
                        {garageLastVisit.wash.length ? (
                          <div className="rowItem__lastEvtLine">
                            <span className="eventLabel">Уход:</span> {garageLastVisit.wash.join(', ')}
                          </div>
                        ) : null}
                        {garageLastVisit.det.length ? (
                          <div className="rowItem__lastEvtLine">
                            <span className="eventLabel">Детейлинг:</span> {garageLastVisit.det.join(', ')}
                          </div>
                        ) : null}
                        {garageLastVisit.note ? (
                          <div className="rowItem__lastEvtLine">
                            <span className="eventLabel">Комментарий:</span> {garageLastVisit.note}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </div>
              ) : null}
              {!garageLastVisitLoading && !garageLastVisit ? (
                <p className="muted small garageProfileCard__metaLine">
                  <span className="garageProfileCard__metaKey">Последний визит:</span> Нет истории
                </p>
              ) : null}
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
                  {owner?.garagePrivate && publicUrl ? (
                    <p className="muted small garageProfileCard__linkBlockNote">
                      Для гостей витрина по ссылке сейчас закрыта — откройте настройки и включите «Выйти на улицу».
                    </p>
                  ) : null}
                </div>
              ) : owner?.garagePrivate && publicUrl ? (
                <p className="muted small garageProfileCard__linkBlockNote garageProfileCard__metaLine--spaced">
                  Для гостей витрина по ссылке сейчас закрыта — откройте настройки и включите «Выйти на улицу».
                </p>
              ) : null}
            </div>
            {!publicUrl ? (
              <p className="muted small garageProfileCard__lead">
                Задайте короткий адрес улицы в настройках — появится ссылка для гостей (латиница, цифры, дефис). Открыть
                настройки: нажмите на аватар справа{bannerSurfaceVisible ? ' или на значок карандаша на баннере' : ''}.
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
            <div className="garageProfileCard__footerActions">
              {limits.canVinClaim ? (
                <Link
                  className="btn garageVinClaimBtn"
                  data-variant="outline"
                  to="/garage#garage-vin-claim"
                  aria-label="Найти авто по VIN"
                >
                  <span className="garageVinClaimBtn__full">Найти авто по VIN</span>
                  <span className="garageVinClaimBtn__short" aria-hidden="true">
                    VIN
                  </span>
                </Link>
              ) : (
                <span
                  className="btn btn--asDisabled garageVinClaimBtn"
                  data-variant="outline"
                  title={`В гараже не больше ${OWNER_MAX_TOTAL_CARS} автомобилей`}
                  aria-label="Найти авто по VIN"
                >
                  <span className="garageVinClaimBtn__full">Найти авто по VIN</span>
                  <span className="garageVinClaimBtn__short" aria-hidden="true">
                    VIN
                  </span>
                </span>
              )}
            </div>
            <HeroCoverStat
              kind="car"
              variant="card"
              className="garageProfileCard__carStat"
              value={cars.length}
              title={limits.canAddManual ? garageCarStatTitle : addCarLimitTitle}
              to="/create"
              linkDisabled={!limits.canAddManual}
              aria-label={!limits.canAddManual ? garageCarStatTitle : undefined}
            />
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {cars.length ? (
          <>
            <h2 className="h2" style={{ marginBottom: 10 }}>
              Автомобили в гараже:
            </h2>
            <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/garage" cars={cars} />
            <OwnerVinClaimSection
              ownerEmail={ownerEmail}
              cars={cars}
              ownerClaims={ownerClaims}
              sectionId="garage-vin-claim"
              style={{ marginTop: 16 }}
            />
          </>
        ) : (
          <OwnerVinClaimSection
            ownerEmail={ownerEmail}
            cars={cars}
            ownerClaims={ownerClaims}
            sectionId="garage-vin-claim"
          />
        )}
      </div>
    </div>
  )
}
