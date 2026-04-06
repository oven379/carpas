import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Button, Card, ComboBox, Field, Input, PageLoadSpinner, Pill, ServiceHint } from '../components.jsx'
import { DETAILING_ACCESS_SERVICE_ONLY_LABEL, detailingCarAccessBadge } from '../serviceLinkUi.js'
import {
  describeRuPlateValidationError,
  describeVinValidationError,
  displayRuPhone,
  fmtDate,
  fmtPlateFull,
  normDigits,
  normVin,
  parsePlateFull,
} from '../../lib/format.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { RUSSIAN_MILLION_PLUS_CITIES } from '../../lib/russianMillionCities.js'
import {
  detailingNavGeocodeQuery,
  detailingYandexMapsWebHref,
  isWholeLineYandexMapsUrl,
} from '../../lib/mapsLinks.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import { useDetailing } from '../useDetailing.js'

function rowHeroBackgroundStyle(hero) {
  const bg = resolvedBackgroundImageUrl(hero)
  return bg ? { backgroundImage: bg } : undefined
}

function normStr(s) {
  return String(s || '').trim().toLowerCase()
}

function onlyDigits(s) {
  return String(s || '').replace(/[^\d]/g, '')
}

/** VIN из строки поиска: normVin + запасной путь без пробелов (кириллица в буфере не ломает 17 латиниц). */
function resolveVinFromDashboardQuery(qRaw) {
  const q = String(qRaw || '').trim()
  if (!q) return ''
  const v1 = normVin(q)
  if (v1.length === 17 && !describeVinValidationError(v1)) return v1
  const compact = q.replace(/[\s\-_\u00A0\u200B]+/g, '').toUpperCase()
  if (compact.length !== 17 || !/^[A-Z0-9]{17}$/.test(compact)) return ''
  const v2 = normVin(compact)
  return v2.length === 17 && !describeVinValidationError(v2) ? v2 : ''
}

function buildYearOptions(carYear) {
  const end = new Date().getFullYear() + 1
  const start = 1980
  const set = new Set()
  const y = Number(carYear)
  if (Number.isFinite(y) && y >= start && y <= end) set.add(y)
  for (let i = end; i >= start; i--) set.add(i)
  return [...set].sort((a, b) => b - a).map(String)
}

function inferPrefill(qRaw) {
  const q = String(qRaw || '').trim()
  const qLower = q.toLowerCase()
  const digits = onlyDigits(q)

  const looksLikeEmail = qLower.includes('@') && qLower.includes('.')

  const resolvedVin = resolveVinFromDashboardQuery(q)
  const isVin = Boolean(resolvedVin)

  const plateCandidate = q.replace(/\s+/g, '')
  const plateParsed = parsePlateFull(plateCandidate)
  const plateOk =
    !isVin &&
    /[a-zа-я]/i.test(plateCandidate) &&
    /\d/.test(plateCandidate) &&
    plateCandidate.length <= 12 &&
    !describeRuPlateValidationError(plateParsed.plate, plateParsed.plateRegion)

  return {
    vin: isVin && !looksLikeEmail ? resolvedVin : '',
    plate: plateOk && !looksLikeEmail ? plateParsed.plate : '',
    plateRegion: plateOk && !looksLikeEmail ? plateParsed.plateRegion : '',
    // 17-символьный VIN даёт ≥10 цифр — не считаем это телефоном
    clientPhone: !isVin && !looksLikeEmail && digits.length >= 10 ? q : '',
    clientEmail: looksLikeEmail ? qLower : '',
  }
}

/** 10 цифр после страны для API search-duplicate (без VIN в строке). */
function duplicateSearchPhoneKey(qRaw) {
  if (resolveVinFromDashboardQuery(qRaw)) return ''
  const pre = inferPrefill(qRaw)
  if (!pre.clientPhone) return ''
  const d = onlyDigits(pre.clientPhone)
  if (d.length < 10) return ''
  let x = d
  if (x.startsWith('8')) x = `7${x.slice(1)}`
  if (x.startsWith('7') && x.length === 11) x = x.slice(1)
  const last10 = x.slice(-10)
  return /^\d{10}$/.test(last10) ? last10 : ''
}

function isStrictHit(car, qRaw) {
  const q = String(qRaw || '').trim()
  if (!q) return false
  const qLower = normStr(q)
  const qDigits = onlyDigits(q)
  const qResolved = resolveVinFromDashboardQuery(qRaw)
  const vin = normStr(car?.vin)
  const plate = normStr(car?.plate)
  const clientPhoneDigits = onlyDigits(car?.clientPhone)
  const ownerPhoneDigits = onlyDigits(car?.ownerPhone)

  if (qResolved && qResolved === normVin(car?.vin)) return true
  if (vin && qLower === vin) return true
  if (plate && qLower === plate) return true
  // Цифры из полного VIN (≥10) не сравниваем с телефоном
  if (!qResolved && qDigits && qDigits.length >= 10) {
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
  const [dashReady, setDashReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!detailingId || mode !== 'detailing') {
        setCars([])
        setInboxClaims([])
        setLastVisitByCarId({})
        setDashReady(false)
        return
      }
      setDashReady(false)
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
      } finally {
        if (!cancelled) setDashReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, detailingId, mode])

  const filtered = useMemo(() => cars.filter((c) => matches(c, q)), [cars, q])
  const strictHits = useMemo(() => cars.filter((c) => isStrictHit(c, q)), [cars, q])
  const quickTargetCar = strictHits.length === 1 ? strictHits[0] : null

  const [externalLinkHits, setExternalLinkHits] = useState([])
  const [externalLinkKind, setExternalLinkKind] = useState(null)
  const [linkEvidenceByCarId, setLinkEvidenceByCarId] = useState({})
  const [linkBusyId, setLinkBusyId] = useState(null)

  useEffect(() => {
    if (!detailingId || mode !== 'detailing') {
      setExternalLinkHits([])
      setExternalLinkKind(null)
      return
    }
    if (strictHits.length > 0) {
      setExternalLinkHits([])
      setExternalLinkKind(null)
      return
    }
    const v = resolveVinFromDashboardQuery(q)
    const phoneKey = v ? '' : duplicateSearchPhoneKey(q)
    if (!v && !phoneKey) {
      setExternalLinkHits([])
      setExternalLinkKind(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        if (!r.findDuplicateCarsForDetailing) {
          if (!cancelled) {
            setExternalLinkHits([])
            setExternalLinkKind(null)
          }
          return
        }
        const res = await r.findDuplicateCarsForDetailing(
          v ? { vin: v } : { clientPhone: `+7${phoneKey}` },
        )
        const list = Array.isArray(res) ? res : []
        const mine = new Set(cars.map((c) => String(c.id)))
        const ext = list.filter((c) => !mine.has(String(c.id)))
        if (!cancelled) {
          setExternalLinkHits(ext)
          setExternalLinkKind(v ? 'vin' : 'phone')
        }
      } catch {
        if (!cancelled) {
          setExternalLinkHits([])
          setExternalLinkKind(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cars, q, detailingId, mode, r, r._version, strictHits.length])

  async function onLinkPersonalGarageCar(car) {
    const ev = linkEvidenceByCarId[car.id] || { year: '', city: '' }
    const year = String(ev.year || '').trim()
    const city = String(ev.city || '').trim()
    const yearOk = year !== '' && String(car.year ?? '') === year
    const cityNorm = (s) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
    const cityOk =
      cityNorm(city) !== '' &&
      cityNorm(car.city) !== '' &&
      cityNorm(city) === cityNorm(car.city)
    if (!yearOk && !cityOk) {
      alert('Укажите год выпуска и/или город как в карточке владельца (хотя бы одно совпадение).')
      return
    }
    if (!r.linkPersonalGarageCar) {
      alert('Действие недоступно в этой сборке.')
      return
    }
    setLinkBusyId(car.id)
    try {
      await r.linkPersonalGarageCar({ carId: car.id, year, city })
      invalidateRepo()
      alert('Автомобиль добавлен в ваш кабинет. Владелец сохраняет доступ в гараже.')
    } catch (e) {
      alert(formatHttpErrorMessage(e, 'Не удалось добавить автомобиль.'))
    } finally {
      setLinkBusyId(null)
    }
  }

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!dashReady) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
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
  const { display: phoneDisplay, telHref: phoneHref } = displayRuPhone(det?.phone)
  const coverBg = resolvedBackgroundImageUrl(det?.cover)

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
                  } catch {
                    /* ignore */
                  }
                  setTimeout(() => {
                    try {
                      window.open(mapsHref, '_blank', 'noreferrer')
                    } catch {
                      /* ignore */
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
            {phoneDisplay ? (
              phoneHref ? (
                <a href={phoneHref} title="Позвонить">
                  {phoneDisplay}
                </a>
              ) : (
                phoneDisplay
              )
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
        style={coverBg ? { backgroundImage: coverBg } : undefined}
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
              <img alt="Логотип" src={resolvePublicMediaUrl(det.logo)} />
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
                Список авто на обслуживании. В поиске можно указать VIN или номер телефона (10 цифр) — если машина в
                личном гараже клиента уже есть в КарПас, появится блок «Добавить к нам», как при совпадении по VIN.
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
                const vinResolved = resolveVinFromDashboardQuery(q)
                const phoneScrollKey = duplicateSearchPhoneKey(q)
                if ((vinResolved || phoneScrollKey) && externalLinkHits.length > 0) {
                  document
                    .getElementById('det-external-link-card')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

      {externalLinkHits.length > 0 ? (
        <Card id="det-external-link-card" className="card pad detExternalVinCard" style={{ marginTop: 12 }}>
          <div className="cardTitle" style={{ margin: 0 }}>
            {externalLinkKind === 'phone'
              ? 'По этому телефону есть авто в системе, но не в вашем списке'
              : 'Этот VIN есть в системе, но не в вашем списке'}
          </div>
          <p className="muted small" style={{ margin: '8px 0 12px', maxWidth: '62ch', lineHeight: 1.5 }}>
            Для авто из <strong>личного гаража</strong> владельца: подтвердите год и/или город (как в заявке с улицы) и
            нажмите «Добавить к нам» — карточка появится у вас и останется у клиента (без дубля). Карточка{' '}
            <strong>другого сервиса</strong> сюда не переносится — создайте новую у себя или дождитесь заявки клиента.
          </p>
          <div className="list">
            {externalLinkHits.slice(0, 8).map((c) => {
              const fromGarage = Boolean(c.vinHitFromOwnerGarage)
              const ev = linkEvidenceByCarId[c.id] || { year: '', city: '' }
              const yearOpts = buildYearOptions(c.year)
              const linkBusy = linkBusyId === c.id
              return (
                <Card key={`ext-${c.id}`} className="card pad vinNetworkHitCard">
                  <div className="vinNetworkHitCard__layout">
                    <div
                      className="vinNetworkHitCard__hero"
                      style={rowHeroBackgroundStyle(c.hero)}
                      aria-hidden={c.hero ? undefined : true}
                    />
                    <div className="vinNetworkHitCard__body">
                      <div className="rowItem__title row gap wrap" style={{ alignItems: 'center' }}>
                        <span>
                          {c.make} {c.model}
                        </span>
                        {fromGarage ? (
                          <Pill tone="accent">Личный гараж владельца</Pill>
                        ) : c.detailingName ? (
                          <Pill tone="neutral">{c.detailingName}</Pill>
                        ) : null}
                      </div>
                      <div className="rowItem__meta carPage__meta mono" style={{ marginTop: 6 }}>
                        VIN: {c.vin || '—'}
                      </div>
                      {fromGarage ? (
                        <>
                          <p className="muted small" style={{ margin: '10px 0 0', lineHeight: 1.45 }}>
                            Подтвердите <strong>год</strong> и/или <strong>город</strong> как в карточке владельца — как при
                            заявке клиента с улицы.
                          </p>
                          <div className="formGrid" style={{ marginTop: 10 }}>
                            <Field label="Год выпуска">
                              <ComboBox
                                value={ev.year}
                                options={yearOpts}
                                placeholder="Как в карточке"
                                onChange={(v) =>
                                  setLinkEvidenceByCarId((m) => ({
                                    ...m,
                                    [c.id]: {
                                      ...ev,
                                      year: normDigits(String(v), { max: 2100, maxLen: 4 }),
                                    },
                                  }))
                                }
                              />
                            </Field>
                            <Field label="Город">
                              <ComboBox
                                value={ev.city}
                                options={RUSSIAN_MILLION_PLUS_CITIES}
                                placeholder="Как в карточке владельца"
                                maxItems={24}
                                onChange={(v) =>
                                  setLinkEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, city: v } }))
                                }
                              />
                            </Field>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Button
                              className="btn"
                              variant="primary"
                              type="button"
                              disabled={linkBusy}
                              aria-busy={linkBusy || undefined}
                              onClick={() => void onLinkPersonalGarageCar(c)}
                            >
                              {linkBusy ? 'Добавление…' : 'Добавить к нам'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="muted small" style={{ margin: '10px 0 0', lineHeight: 1.45 }}>
                          Эта карточка привязана к другому сервису. Создайте новую у себя по кнопке «+ Добавить авто» —
                          при совпадении VIN система подскажет о дубле.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      ) : null}

      <div className="list" style={{ marginTop: 12 }}>
        {filtered.map((c) => {
          const fromDash = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
          const lastVisitAt = lastVisitByCarId[c.id] || null
          const carHref = `/car/${c.id}?from=${encodeURIComponent(fromDash)}`
          const access = detailingCarAccessBadge(c, detailingId, inboxClaims)
          const ownerInApp = access.label === 'Владелец в приложении'
          const ownerPeekLabel =
            String(c.ownerName || '').trim() || String(c.ownerEmail || '').trim() || 'Владелец'
          const ownerPeekInitials = ownerPeekLabel.slice(0, 2).toUpperCase() || '?'
          const ownerSlug = String(c.ownerGarageSlug || '').trim()
          const ownerAvatarRaw = String(c.ownerGarageAvatar || '').trim()
          const ownerAvatar = ownerAvatarRaw ? resolvePublicMediaUrl(ownerAvatarRaw) : ''
          /* Телефон в полосе владельца — из ЛК/гаража (поле владельца), не «клиентский» номер в карточке авто */
          const garageOwnerPhone = String(c.ownerAccountPhone || '').trim()
          const { display: ownerPhoneRaw, telHref: ownerPhoneHref } = displayRuPhone(garageOwnerPhone)
          const clientSummaryText =
            c.clientName ||
            c.clientPhone ||
            c.clientEmail ||
            c.ownerEmail ||
            c.ownerPhone ||
            '—'
          return (
            <div key={c.id} className={`rowItem${ownerInApp ? ' rowItem--ownerPeek' : ''}`}>
              <Link
                className="rowItem__rowLink"
                to={carHref}
                aria-label={`Открыть карточку: ${c.make} ${c.model}`}
              >
                <div
                  className="rowItem__img"
                  style={rowHeroBackgroundStyle(c.hero)}
                />
                <div className="rowItem__main">
                  <div className="rowItem__title row gap wrap" style={{ alignItems: 'center' }}>
                    <span>
                      {c.make} {c.model}
                    </span>
                    {!ownerInApp &&
                    access.label &&
                    access.label !== DETAILING_ACCESS_SERVICE_ONLY_LABEL ? (
                      <Pill tone={access.tone}>{access.label}</Pill>
                    ) : null}
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
                  <div
                    className={
                      ownerInApp
                        ? 'rowItem__sub rowItem__sub--hideWhenOwnerSummary'
                        : 'rowItem__sub'
                    }
                  >
                    <span className="clientBlockLabel">Клиент:</span> {clientSummaryText}
                  </div>
                </div>
              </Link>
              {ownerInApp ? (
                <div className="rowItem__ownerSummary">
                  <div className="rowItem__ownerSummaryBody">
                    <div className="rowItem__ownerSummaryOwnerLine">
                      <span className="rowItem__ownerSummaryLabel">Владелец:</span>{' '}
                      <span className="rowItem__ownerSummaryName">{ownerPeekLabel}</span>
                    </div>
                    {ownerPhoneHref ? (
                      <a className="rowItem__ownerSummaryPhone" href={ownerPhoneHref}>
                        {ownerPhoneRaw}
                      </a>
                    ) : garageOwnerPhone ? (
                      <span className="muted small">{ownerPhoneRaw || garageOwnerPhone}</span>
                    ) : (
                      <span className="muted small">Телефон в гараже не указан</span>
                    )}
                  </div>
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
            <div className="muted">Ничего не найдено. Измените поиск или фильтр.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

