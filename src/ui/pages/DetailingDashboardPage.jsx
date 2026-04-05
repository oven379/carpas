import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { Card, Field, Input, Pill, ServiceHint } from '../components.jsx'
import { detailingCarAccessBadge } from '../serviceLinkUi.js'
import {
  describeRuPlateValidationError,
  describeVinValidationError,
  fmtDate,
  fmtPlateFull,
  normVin,
  parsePlateFull,
} from '../../lib/format.js'
import {
  detailingNavGeocodeQuery,
  detailingYandexMapsWebHref,
  isWholeLineYandexMapsUrl,
} from '../../lib/mapsLinks.js'
import { useDetailing } from '../useDetailing.js'

function normStr(s) {
  return String(s || '').trim().toLowerCase()
}

function onlyDigits(s) {
  return String(s || '').replace(/[^\d]/g, '')
}

function inferPrefill(qRaw) {
  const q = String(qRaw || '').trim()
  const qLower = q.toLowerCase()
  const digits = onlyDigits(q)

  const looksLikeEmail = qLower.includes('@') && qLower.includes('.')

  const vinCandidate = normVin(q)
  const isVin = vinCandidate.length === 17 && !describeVinValidationError(vinCandidate)

  const plateCandidate = q.replace(/\s+/g, '')
  const plateParsed = parsePlateFull(plateCandidate)
  const plateOk =
    /[a-zа-я]/i.test(plateCandidate) &&
    /\d/.test(plateCandidate) &&
    plateCandidate.length <= 12 &&
    !describeRuPlateValidationError(plateParsed.plate, plateParsed.plateRegion)

  return {
    vin: isVin && !looksLikeEmail ? vinCandidate : '',
    plate: plateOk && !looksLikeEmail ? plateParsed.plate : '',
    plateRegion: plateOk && !looksLikeEmail ? plateParsed.plateRegion : '',
    clientPhone: digits.length >= 10 ? q : '',
    clientEmail: looksLikeEmail ? qLower : '',
  }
}

function isStrictHit(car, qRaw) {
  const q = String(qRaw || '').trim()
  if (!q) return false
  const qLower = normStr(q)
  const qDigits = onlyDigits(q)
  const qVin = normVin(q)
  const vin = normStr(car?.vin)
  const plate = normStr(car?.plate)
  const clientPhoneDigits = onlyDigits(car?.clientPhone)
  const ownerPhoneDigits = onlyDigits(car?.ownerPhone)

  if (qVin && qVin.length === 17 && qVin === normVin(car?.vin)) return true
  if (vin && qLower === vin) return true
  if (plate && qLower === plate) return true
  if (qDigits && qDigits.length >= 10) {
    if (clientPhoneDigits && clientPhoneDigits.endsWith(qDigits)) return true
    if (ownerPhoneDigits && ownerPhoneDigits.endsWith(qDigits)) return true
  }
  return false
}

function matches(car, q) {
  if (!q) return true
  const s = String(q || '').trim().toLowerCase()
  if (!s) return true
  const digits = s.replace(/[^\d+]/g, '')
  return (
    String(car.vin || '').toLowerCase().includes(s) ||
    String(car.plate || '').toLowerCase().includes(s) ||
    String(car.make || '').toLowerCase().includes(s) ||
    String(car.model || '').toLowerCase().includes(s) ||
    String(car.city || '').toLowerCase().includes(s) ||
    String(car.ownerEmail || '').toLowerCase().includes(s) ||
    String(car.ownerPhone || '').replace(/[^\d+]/g, '').includes(digits) ||
    String(car.clientName || '').toLowerCase().includes(s) ||
    String(car.clientEmail || '').toLowerCase().includes(s) ||
    String(car.clientPhone || '').replace(/[^\d+]/g, '').includes(digits) ||
    String(car.seller?.name || '').toLowerCase().includes(s)
  )
}

export default function DetailingDashboardPage() {
  const r = useRepo()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''

  const { detailingId, mode, detailing, loading } = useDetailing()
  const [cars, setCars] = useState([])
  const [inboxClaims, setInboxClaims] = useState([])
  const [lastVisitByCarId, setLastVisitByCarId] = useState({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!detailingId || mode !== 'detailing') {
        setCars([])
        setInboxClaims([])
        setLastVisitByCarId({})
        return
      }
      try {
        const [carList, claims] = await Promise.all([r.listCars(), r.listClaimsForDetailing()])
        if (cancelled) return
        const cl = Array.isArray(carList) ? carList : []
        setCars(cl)
        setInboxClaims(Array.isArray(claims) ? claims : [])
        const entries = await Promise.all(
          cl.map(async (car) => {
            try {
              const ev = await r.listEvents(car.id)
              const at = Array.isArray(ev) && ev.length ? ev[0]?.at : null
              return [car.id, at]
            } catch {
              return [car.id, null]
            }
          }),
        )
        if (cancelled) return
        setLastVisitByCarId(Object.fromEntries(entries))
      } catch {
        if (!cancelled) {
          setCars([])
          setInboxClaims([])
          setLastVisitByCarId({})
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, detailingId, mode])

  const filtered = useMemo(() => cars.filter((c) => matches(c, q)), [cars, q])
  const strictHits = useMemo(() => cars.filter((c) => isStrictHit(c, q)), [cars, q])
  const quickTargetCar = strictHits.length === 1 ? strictHits[0] : null

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (detailing?.profileCompleted === false) return <Navigate to="/detailing/landing" replace />

  const det = detailing
  const initials = String(det?.name || 'Д').trim().slice(0, 2).toUpperCase()
  const addrRaw = String(det?.address || '').trim()
  const addressIsYandexUrl = isWholeLineYandexMapsUrl(addrRaw)
  const addressText = [det?.city, det?.address].filter(Boolean).join(', ')
  const mapsHref = detailingYandexMapsWebHref(det)
  const geoQuery = detailingNavGeocodeQuery(det)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const navHref = geoQuery ? (isIOS ? `maps://?q=${encodeURIComponent(geoQuery)}` : `geo:0,0?q=${encodeURIComponent(geoQuery)}`) : ''
  const addressLinkLabel = addressIsYandexUrl ? 'Открыть точку и построить маршрут' : det?.address || addressText
  const showAddressLink = Boolean(mapsHref)
  const phoneDigits = String(det?.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : ''

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Автомобили</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <h1 className="h1" style={{ margin: 0 }}>
              {det?.name || 'Детейлинг / СТО'}
            </h1>
          </div>
          <p className="muted carPage__meta">
            <span>{det?.city || '—'}</span>
            <span aria-hidden="true"> · </span>
            {showAddressLink ? (
              <a
                href={addressIsYandexUrl ? mapsHref : navHref || mapsHref}
                target={addressIsYandexUrl || !navHref ? '_blank' : undefined}
                rel={addressIsYandexUrl || !navHref ? 'noopener noreferrer' : undefined}
                title={addressIsYandexUrl ? 'Яндекс.Карты: точка и маршрут' : 'Открыть в навигаторе'}
                onClick={(e) => {
                  if (addressIsYandexUrl || !navHref) return
                  e.preventDefault()
                  try {
                    window.location.href = navHref
                  } catch (err) {
                    console.warn(err)
                  }
                  setTimeout(() => {
                    try {
                      window.open(mapsHref, '_blank', 'noreferrer')
                    } catch (err) {
                      console.warn(err)
                    }
                  }, 450)
                }}
              >
                {addressLinkLabel}
              </a>
            ) : (
              <span>—</span>
            )}
            <span aria-hidden="true"> · </span>
            {det?.phone ? (
              <a href={phoneHref} title="Позвонить">
                {det.phone}
              </a>
            ) : (
              <span>—</span>
            )}
          </p>
          {String(det?.workingHours || '').trim() ? (
            <p className="muted small" style={{ marginTop: 6, maxWidth: '62ch', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {String(det.workingHours).trim()}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="detHero detHero--card"
        style={det?.cover ? { backgroundImage: `url("${String(det.cover).replaceAll('"', '%22')}")` } : undefined}
      >
        <div className="detHero__overlay detHero__overlay--card">
          <Link
            className="btn detHero__editBtn detHero__editBtn--icon"
            data-variant="ghost"
            to="/detailing/landing"
            aria-label="Настройки лендинга"
            title="Настройки лендинга"
          >
            <span className="carPage__icon carPage__icon--edit detHero__editIcon" aria-hidden="true" />
          </Link>

          {det?.logo ? (
            <Link
              className="detHero__logo detHero__logo--card detHero__logoLink"
              to={`/d/${encodeURIComponent(String(detailingId))}`}
              title="Открыть публичную страницу детейлинга"
            >
              <img alt="Логотип" src={det.logo} />
            </Link>
          ) : (
            <Link
              className="detHero__logo detHero__logo--card detHero__logoLink"
              to={`/d/${encodeURIComponent(String(detailingId))}`}
              title="Открыть публичную страницу детейлинга"
            >
              <span aria-hidden="true">{initials}</span>
            </Link>
          )}
        </div>
      </div>

      <Card className="card pad detSearchCard detSearchCard--sticky" style={{ marginTop: 12 }}>
        <div className="row gap detSearchCard__row detSearchCard__row--main">
          <Input
            className="input detSearchCard__input"
            placeholder="Поиск… (VIN / номер / телефон / почта / марка)"
            value={q}
            onChange={(e) => setSp({ q: e.target.value }, { replace: true })}
          />
          <div className="detSearchCard__actions">
            <ServiceHint scopeId="detailing-dash-empty-hint" variant="compact" label="Справка: список авто">
              <p className="serviceHint__panelText">
                Список авто на обслуживании. Панель поиска и «Добавить авто» закреплены под шапкой при прокрутке длинного
                списка.
              </p>
            </ServiceHint>
            <button
              type="button"
              className="btn detSearchCard__addBtn"
              data-variant="primary"
              onClick={() => {
                const from = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
                if (quickTargetCar) {
                  nav(`/car/${quickTargetCar.id}/history?new=1&from=${encodeURIComponent(from)}`)
                  return
                }
                const pre = inferPrefill(q)
                const qp = new URLSearchParams()
                if (pre.vin) qp.set('vin', pre.vin)
                if (pre.plate) qp.set('plate', pre.plate)
                if (pre.plateRegion) qp.set('plateRegion', pre.plateRegion)
                if (pre.clientPhone) qp.set('clientPhone', pre.clientPhone)
                if (pre.clientEmail) qp.set('clientEmail', pre.clientEmail)
                const qs = qp.toString()
                nav(`/create${qs ? `?${qs}` : ''}`)
              }}
              title={
                quickTargetCar
                  ? 'Открыть создание визита для найденного авто'
                  : 'Создать новое авто (VIN/номер/телефон подставятся автоматически)'
              }
            >
              {quickTargetCar ? '+ Визит' : '+ Добавить авто'}
            </button>
          </div>
        </div>
      </Card>

      <div className="list" style={{ marginTop: 12 }}>
        {filtered.map((c) => {
          const fromDash = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
          const lastVisitAt = lastVisitByCarId[c.id] || null
          const carHref = `/car/${c.id}?from=${encodeURIComponent(fromDash)}`
          const access = detailingCarAccessBadge(c, detailingId, inboxClaims)
          const ownerInApp = access.label === 'Владелец в приложении'
          const ownerPeekLabel = String(c.ownerEmail || '').trim() || 'Владелец'
          const ownerPeekInitials = ownerPeekLabel.slice(0, 2).toUpperCase() || '?'
          const ownerSlug = ''
          const ownerAvatar = ''
          const ownerPhoneRaw = ''
          const ownerPhoneHref = ''
          const ownerPhonePublic = false
          return (
            <div key={c.id} className={`rowItem${ownerInApp ? ' rowItem--ownerPeek' : ''}`}>
              <Link
                className="rowItem__rowLink"
                to={carHref}
                aria-label={`Открыть карточку: ${c.make} ${c.model}`}
              >
                <div
                  className="rowItem__img"
                  style={c.hero ? { backgroundImage: `url("${String(c.hero).replaceAll('"', '%22')}")` } : undefined}
                />
                <div className="rowItem__main">
                  <div className="rowItem__title row gap wrap" style={{ alignItems: 'center' }}>
                    <span>
                      {c.make} {c.model}
                    </span>
                    {!ownerInApp && access.label ? <Pill tone={access.tone}>{access.label}</Pill> : null}
                  </div>
                  <div className="rowItem__meta carPage__meta">
                    <span>{c.city || '—'}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="mono" title="Госномер">
                      {fmtPlateFull(c.plate, c.plateRegion) || '—'}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>
                      VIN: <span className="mono">{c.vin || '—'}</span>
                    </span>
                    {lastVisitAt ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{fmtDate(lastVisitAt)}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="rowItem__sub">
                    Клиент:{' '}
                    {c.clientName || c.clientPhone || c.clientEmail || c.ownerEmail || c.ownerPhone || '—'}
                  </div>
                </div>
              </Link>
              {ownerInApp ? (
                <div className="rowItem__ownerSummary">
                  {ownerSlug ? (
                    <Link
                      className="rowItem__ownerSummaryAvatar"
                      to={`/g/${encodeURIComponent(ownerSlug)}`}
                      state={{ from: fromDash }}
                      title={`Открыть страницу владельца: ${ownerPeekLabel}`}
                      aria-label={`Публичная страница владельца ${ownerPeekLabel}`}
                    >
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" />
                      ) : (
                        <span className="rowItem__ownerSummaryFallback" aria-hidden="true">
                          {ownerPeekInitials}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span
                      className="rowItem__ownerSummaryAvatar rowItem__ownerSummaryAvatar--disabled"
                      title="Публичная улица не задана"
                      aria-label="Публичная улица не задана"
                    >
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" />
                      ) : (
                        <span className="rowItem__ownerSummaryFallback">{ownerPeekInitials}</span>
                      )}
                    </span>
                  )}
                  <div className="rowItem__ownerSummaryBody">
                    <div className="rowItem__ownerSummaryTitle">{ownerPeekLabel}</div>
                    {ownerPhonePublic && ownerPhoneHref ? (
                      <a className="rowItem__ownerSummaryPhone" href={ownerPhoneHref}>
                        {ownerPhoneRaw}
                      </a>
                    ) : ownerPhoneRaw && !ownerPhonePublic ? (
                      <span className="muted small" title="Владелец не разрешил публикацию телефона на улице">
                        Телефон скрыт на улице
                      </span>
                    ) : (
                      <span className="muted small">Телефон в аккаунте не указан</span>
                    )}
                  </div>
                </div>
              ) : null}
              {ownerInApp ? (
                <div className="rowItem__ownerPeek">
                  {ownerSlug ? (
                    <Link
                      className="rowItem__ownerPeekLink"
                      to={`/g/${encodeURIComponent(ownerSlug)}`}
                      state={{ from: fromDash }}
                      title={`Публичная страница: ${ownerPeekLabel}`}
                      aria-label={`Открыть страницу владельца: ${ownerPeekLabel}`}
                    >
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" />
                      ) : (
                        <span className="rowItem__ownerPeekFallback" aria-hidden="true">
                          {ownerPeekInitials}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span
                      className="rowItem__ownerPeekLink rowItem__ownerPeekLink--disabled"
                      title="У владельца не задан адрес публичной страницы /g/…"
                      aria-label="Публичная страница владельца не задана"
                    >
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" />
                      ) : (
                        <span className="rowItem__ownerPeekFallback" aria-hidden="true">
                          {ownerPeekInitials}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="rowItem__aside">
                <button
                  type="button"
                  className="btn"
                  data-variant="primary"
                  onClick={() => {
                    nav(`/car/${c.id}/history?new=1&from=${encodeURIComponent(fromDash)}`)
                  }}
                  title="Быстро добавить визит"
                >
                  + Визит
                </button>
              </div>
            </div>
          )
        })}

        {cars.length > 0 && filtered.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Ничего не найдено. Попробуйте другой запрос.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

