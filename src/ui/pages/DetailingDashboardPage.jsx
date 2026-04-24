import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import {
  Button,
  Card,
  CityComboBox,
  ComboBox,
  Field,
  Input,
  PageLoadSpinner,
  Pill,
  ServiceHint,
} from '../components.jsx'
import { detailingCarAccessBadge, detailingCarHasLinkedOwner, publicDetailingPath } from '../serviceLinkUi.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import {
  CITY_FIELD_DD_HINT,
  comparablePhoneDigitsRu,
  describeRuPlateValidationError,
  describeVinValidationError,
  displayRuPhone,
  fmtDate,
  fmtPlateFull,
  normDigits,
  normPlateBase,
  normPlateRegion,
  normVin,
  parsePlateFull,
} from '../../lib/format.js'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import { useDetailing } from '../useDetailing.js'

function rowHeroBackgroundStyle(hero) {
  const bg = resolvedBackgroundImageUrl(hero)
  return bg ? { backgroundImage: bg } : undefined
}

/** VIN из строки поиска: normVin + запасной путь без пробелов (кириллица в буфере не ломает 17 латиниц). */
function resolveVinFromDashboardQuery(qRaw) {
  const q = String(qRaw || '').trim()
  if (!q) return ''
  const phoneCmp = comparablePhoneDigitsRu(q)
  const latinLetters = (q.match(/[A-Za-z]/g) || []).length
  if (phoneCmp.length >= 10 && latinLetters === 0) return ''
  const v1 = normVin(q)
  if (v1.length === 17 && !describeVinValidationError(v1)) return v1
  const compact = q.replace(/[\s\-_\u00A0\u200B]+/g, '').toUpperCase()
  if (compact.length !== 17 || !/^[A-Z0-9]{17}$/.test(compact)) return ''
  const v2 = normVin(compact)
  return v2.length === 17 && !describeVinValidationError(v2) ? v2 : ''
}

/** Распознавание запроса: полный VIN, госномер РФ, телефон (от 10 цифр — отдельный режим без конфликта с VIN). */
function classifyDetailingDashboardQuery(qRaw) {
  const raw = String(qRaw || '').trim()
  if (!raw) return { kind: 'empty', raw: '' }

  const phoneCmp = comparablePhoneDigitsRu(raw)
  const latinLetters = (raw.match(/[A-Za-z]/g) || []).length
  if (phoneCmp.length >= 10 && latinLetters === 0) {
    return { kind: 'phone', phoneCmp, raw }
  }

  const vin = resolveVinFromDashboardQuery(raw)
  if (vin) return { kind: 'vin', vin, raw }

  const parsed = parsePlateFull(raw)
  const plateErr = describeRuPlateValidationError(parsed.plate, parsed.plateRegion)
  if (!plateErr && parsed.plate && parsed.plateRegion) {
    return {
      kind: 'plate',
      plate: normPlateBase(parsed.plate),
      plateRegion: normPlateRegion(parsed.plateRegion),
      raw,
    }
  }

  if (phoneCmp.length >= 3) {
    return { kind: 'phonePartial', phoneCmp, raw }
  }

  return { kind: 'unknown', raw }
}

function matchesCar(car, intent) {
  if (intent.kind === 'empty') return true
  if (intent.kind === 'vin') {
    const needle = normVin(intent.vin)
    if (!needle) return false
    return normVin(car.vin).includes(needle)
  }
  if (intent.kind === 'plate') {
    return (
      normPlateBase(car.plate) === intent.plate &&
      normPlateRegion(car.plateRegion) === intent.plateRegion
    )
  }
  if (intent.kind === 'phone' || intent.kind === 'phonePartial') {
    const needle = intent.phoneCmp
    if (!needle) return false
    const hay = [
      comparablePhoneDigitsRu(car.clientPhone),
      comparablePhoneDigitsRu(car.ownerPhone),
      comparablePhoneDigitsRu(car.ownerAccountPhone),
    ].filter(Boolean)
    return hay.some((h) => (needle.length >= 10 ? h === needle : h.includes(needle)))
  }
  const raw = intent.raw
  const vinN = normVin(raw)
  if (vinN && normVin(car.vin).includes(vinN)) return true
  const p = parsePlateFull(raw)
  if (p.plate && p.plateRegion && !describeRuPlateValidationError(p.plate, p.plateRegion)) {
    if (
      normPlateBase(car.plate) === normPlateBase(p.plate) &&
      normPlateRegion(car.plateRegion) === normPlateRegion(p.plateRegion)
    ) {
      return true
    }
  }
  const ph = comparablePhoneDigitsRu(raw)
  if (ph.length >= 3) {
    const hay = [
      comparablePhoneDigitsRu(car.clientPhone),
      comparablePhoneDigitsRu(car.ownerPhone),
      comparablePhoneDigitsRu(car.ownerAccountPhone),
    ].filter(Boolean)
    if (hay.some((h) => h.includes(ph))) return true
  }
  return false
}

function isStrictHitCar(car, intent) {
  if (intent.kind === 'vin') return normVin(car.vin) === normVin(intent.vin)
  if (intent.kind === 'plate') {
    return (
      normPlateBase(car.plate) === intent.plate &&
      normPlateRegion(car.plateRegion) === intent.plateRegion
    )
  }
  if (intent.kind === 'phone') {
    const needle = intent.phoneCmp
    const hay = [
      comparablePhoneDigitsRu(car.clientPhone),
      comparablePhoneDigitsRu(car.ownerPhone),
      comparablePhoneDigitsRu(car.ownerAccountPhone),
    ]
    return hay.some((h) => h === needle)
  }
  return false
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

/** Подпись «Клиент:» в списке авто: имя и телефон из учёта; иначе владелец из ЛК; иначе owner_phone с карточки. */
function detailingCarClientListSubline(car, linkedOwner) {
  const phoneLabel = (raw) => {
    const t = String(raw || '').trim()
    if (!t) return ''
    const { display } = displayRuPhone(t)
    return display || t
  }
  const clientName = String(car.clientName || '').trim()
  const clientPhone = String(car.clientPhone || '').trim()
  const parts = []
  if (clientName) parts.push(clientName)
  const clientPhoneLab = phoneLabel(clientPhone)
  if (clientPhoneLab) parts.push(clientPhoneLab)
  if (parts.length) return parts.join(' · ')

  if (linkedOwner) {
    const ownerName = String(car.ownerName || '').trim()
    const ownerAcct = String(car.ownerAccountPhone || '').trim()
    const ownerParts = []
    if (ownerName) ownerParts.push(ownerName)
    const ownerPhoneLab = phoneLabel(ownerAcct)
    if (ownerPhoneLab) ownerParts.push(ownerPhoneLab)
    if (ownerParts.length) return ownerParts.join(' · ')
  }

  const legacy = phoneLabel(car.ownerPhone)
  return legacy || '—'
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

  const searchIntent = useMemo(() => classifyDetailingDashboardQuery(q), [q])
  const filtered = useMemo(() => cars.filter((c) => matchesCar(c, searchIntent)), [cars, searchIntent])
  const strictHits = useMemo(() => cars.filter((c) => isStrictHitCar(c, searchIntent)), [cars, searchIntent])
  const quickTargetCar = strictHits.length === 1 ? strictHits[0] : null

  const [externalLinkHits, setExternalLinkHits] = useState([])
  const [linkEvidenceByCarId, setLinkEvidenceByCarId] = useState({})
  const [linkBusyId, setLinkBusyId] = useState(null)
  const [visitStartBusy, setVisitStartBusy] = useState(false)

  useEffect(() => {
    if (!detailingId || mode !== 'detailing') {
      setExternalLinkHits([])
      return
    }
    if (strictHits.length > 0) {
      setExternalLinkHits([])
      return
    }
    if (searchIntent.kind !== 'vin' && searchIntent.kind !== 'phone' && searchIntent.kind !== 'plate') {
      setExternalLinkHits([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        if (!r.findDuplicateCarsForDetailing) {
          if (!cancelled) setExternalLinkHits([])
          return
        }
        let res = []
        if (searchIntent.kind === 'vin') {
          res = await r.findDuplicateCarsForDetailing({ vin: searchIntent.vin })
        } else if (searchIntent.kind === 'phone') {
          res = await r.findDuplicateCarsForDetailing({ clientPhone: searchIntent.raw })
        } else {
          res = await r.findDuplicateCarsForDetailing({
            plate: searchIntent.plate,
            plateRegion: searchIntent.plateRegion,
          })
        }
        const list = Array.isArray(res) ? res : []
        const mine = new Set(cars.map((c) => String(c.id)))
        const ext = list.filter((c) => !mine.has(String(c.id)))
        if (!cancelled) setExternalLinkHits(ext)
      } catch {
        if (!cancelled) setExternalLinkHits([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cars, detailingId, mode, r, r._version, strictHits.length, searchIntent])

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
  const externalBlockTitle =
    searchIntent.kind === 'phone'
      ? 'По этому номеру найдены карточки вне вашего списка'
      : searchIntent.kind === 'plate'
        ? 'По этому госномеру найдены карточки вне вашего списка'
        : 'Этот VIN есть в системе, но не в вашем списке'

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
          <p className="muted small" style={{ marginTop: 8 }}>
            <Link to="/detailing/landing">Настройки лендинга</Link>
            <span aria-hidden="true"> · </span>
            <Link to={publicDetailingPath(detailing ? { ...detailing, id: detailingId } : { id: detailingId })}>
              Публичная страница
            </Link>
          </p>
        </div>
      </div>

      <Card className="card pad detSearchCard detSearchCard--sticky" style={{ marginTop: 12 }}>
        <div className="row gap detSearchCard__row detSearchCard__row--main">
          <Input
            className="input detSearchCard__input"
            placeholder="VIN"
            value={q}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setSp({ q: e.target.value }, { replace: true })}
          />
          <div className="detSearchCard__actions">
              <ServiceHint scopeId="detailing-dash-empty-hint" variant="compact" label="Справка: список авто">
              <p className="serviceHint__panelText">
                Список авто на обслуживании. Поиск по VIN (в т.ч. частично), по госномеру РФ как на белой табличке (с регионом) и по
                телефону клиента — в карточке авто, в поле «телефон владельца» или в профиле владельца в КарПас. Если карточки ещё нет в
                списке: введите полный VIN (17 символов) и нажмите «+ Добавить авто». Если такой VIN уже есть в сети КарПас, откроется
                визит по общей карточке; если нет — откроется форма полного создания карточки (как у владельца), без привязки к
                клиенту-владельцу. Если авто уже в списке, откроется форма визита по найденной строке. Если по полному
                VIN, по номеру из 10 цифр или по полному госномеру найдётся авто в сервисе, но не в вашем списке, появится блок «Добавить
                к нам» для машин из личного гаража владельца.
              </p>
            </ServiceHint>
            <button
              type="button"
              className="btn detSearchCard__addBtn"
              data-variant="primary"
              disabled={visitStartBusy}
              aria-busy={visitStartBusy || undefined}
              onClick={() => {
                void (async () => {
                  const from = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
                  if (quickTargetCar) {
                    nav(`/car/${quickTargetCar.id}/history?new=1&from=${encodeURIComponent(from)}`)
                    return
                  }
                  const strictLookup =
                    searchIntent.kind === 'vin' ||
                    searchIntent.kind === 'phone' ||
                    searchIntent.kind === 'plate'
                  if (strictLookup && externalLinkHits.length > 0) {
                    document
                      .getElementById('det-external-link-card')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    return
                  }
                  const vinResolved = resolveVinFromDashboardQuery(q)
                  const vinErr = vinResolved ? describeVinValidationError(vinResolved) : null
                  if (!vinResolved || vinErr) {
                    alert(
                      vinErr ||
                        'Чтобы добавить авто без карточки в списке, введите в поиск полный VIN (17 символов латиницы и цифр). Если авто уже у вас — найдите его в списке или уточните запрос.',
                    )
                    return
                  }
                  if (!r.ensureCarForVisit) {
                    alert('Действие недоступно в этой сборке.')
                    return
                  }
                  setVisitStartBusy(true)
                  try {
                    const clientPhone =
                      searchIntent.kind === 'phone' && String(searchIntent.raw || '').trim()
                        ? String(searchIntent.raw).trim()
                        : ''
                    const created = await r.ensureCarForVisit({
                      vin: vinResolved,
                      clientName: '',
                      clientPhone,
                      clientEmail: '',
                    })
                    if (!created?.id) {
                      alert('Не удалось добавить автомобиль.')
                      return
                    }
                    invalidateRepo()
                    nav(`/car/${created.id}/history?new=1&from=${encodeURIComponent(from)}`)
                  } catch (e) {
                    if (e instanceof HttpError && e.status === 404 && e.body && e.body.code === 'car_not_found') {
                      invalidateRepo()
                      nav(`/create?from=${encodeURIComponent(from)}&vin=${encodeURIComponent(vinResolved)}`)
                      return
                    }
                    if (e instanceof HttpError && e.status === 422 && e.body && e.body.code === 'car_in_owner_garage') {
                      alert(
                        typeof e.body.message === 'string' && e.body.message.trim()
                          ? e.body.message.trim()
                          : 'Этот VIN уже в личном гараже владельца в КарПас — новую карточку по нему не создаём.',
                      )
                      return
                    }
                    alert(formatHttpErrorMessage(e, 'Не удалось добавить автомобиль. Проверьте VIN и вход в кабинет.'))
                  } finally {
                    setVisitStartBusy(false)
                  }
                })()
              }}
              title={
                quickTargetCar
                  ? 'Открыть форму нового визита для найденного авто'
                  : 'Добавить авто: нужен полный VIN в строке поиска (17 символов), если карточки ещё нет в вашем списке'
              }
            >
              {visitStartBusy ? 'Подождите…' : '+ Добавить авто'}
            </button>
          </div>
        </div>
      </Card>

      {externalLinkHits.length > 0 ? (
        <Card id="det-external-link-card" className="card pad detExternalVinCard" style={{ marginTop: 12 }}>
          <div className="cardTitle" style={{ margin: 0 }}>{externalBlockTitle}</div>
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
                            <div className="field serviceHint__fieldWrap" id={`det-dash-link-city-${c.id}`}>
                              <div className="field__top serviceHint__fieldTop">
                                <span className="field__label">Город</span>
                                <ServiceHint
                                  scopeId={`det-dash-link-city-${c.id}`}
                                  variant="compact"
                                  label="Справка: город"
                                >
                                  <p className="serviceHint__panelText">{CITY_FIELD_DD_HINT}</p>
                                </ServiceHint>
                              </div>
                              <CityComboBox
                                value={ev.city}
                                maxItems={24}
                                onChange={(v) =>
                                  setLinkEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, city: v } }))
                                }
                              />
                            </div>
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
          const linkedOwner = detailingCarHasLinkedOwner(c)
          const ownerPeekLabel = String(c.ownerName || '').trim() || 'Владелец'
          const ownerPeekInitials = ownerPeekLabel.slice(0, 2).toUpperCase() || '?'
          const ownerSlug = String(c.ownerGarageSlug || '').trim()
          const ownerAvatarRaw = String(c.ownerGarageAvatar || '').trim()
          const ownerAvatar = ownerAvatarRaw ? resolvePublicMediaUrl(ownerAvatarRaw) : ''
          /* Телефон в полосе владельца — из ЛК/гаража (поле владельца), не «клиентский» номер в карточке авто */
          const garageOwnerPhone = String(c.ownerAccountPhone || '').trim()
          const { display: ownerPhoneRaw, telHref: ownerPhoneHref } = displayRuPhone(garageOwnerPhone)
          const clientSummaryText = detailingCarClientListSubline(c, linkedOwner)
          const clientPhoneRawForLink =
            String(c.clientPhone || '').trim() || String(c.ownerPhone || '').trim()
          const clientProfileLine = (() => {
            const cn = String(c.clientName || '').trim()
            if (cn) return cn
            const { display: d1 } = displayRuPhone(String(c.clientPhone || '').trim())
            const cp = String(c.clientPhone || '').trim()
            if (d1 || cp) return d1 || cp
            const { display: d2 } = displayRuPhone(String(c.ownerPhone || '').trim())
            const op = String(c.ownerPhone || '').trim()
            if (d2 || op) return d2 || op
            return '—'
          })()
          const { display: clientPhoneDisplay, telHref: clientPhoneHref } = displayRuPhone(clientPhoneRawForLink)
          return (
            <div key={c.id} className="rowItem rowItem--ownerPeek">
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
                    {access.label === 'Заявка владельца' ? (
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
                  <div className="rowItem__sub rowItem__sub--hideWhenOwnerSummary">
                    <span className="clientBlockLabel">Клиент:</span> {clientSummaryText}
                  </div>
                </div>
              </Link>
              {linkedOwner ? (
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
              ) : (
                <div className="rowItem__ownerSummary">
                  <div className="rowItem__ownerSummaryBody">
                    <div className="rowItem__ownerSummaryOwnerLine">
                      <span className="rowItem__ownerSummaryLabel">Клиент:</span>{' '}
                      <span className="rowItem__ownerSummaryName">{clientProfileLine}</span>
                    </div>
                    {clientPhoneHref ? (
                      <a className="rowItem__ownerSummaryPhone" href={clientPhoneHref}>
                        {clientPhoneDisplay}
                      </a>
                    ) : clientPhoneRawForLink ? (
                      <span className="muted small">{clientPhoneDisplay || clientPhoneRawForLink}</span>
                    ) : (
                      <span className="muted small">Телефон не указан</span>
                    )}
                  </div>
                  <span className="rowItem__ownerSummaryAvatar" aria-hidden="true">
                    <DefaultAvatar
                      email={String(c.clientEmail || '').trim()}
                      fallback={clientProfileLine}
                      alt=""
                    />
                  </span>
                </div>
              )}
              {linkedOwner ? (
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
                      title="У владельца не задан адрес публичной страницы гаража"
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
              ) : (
                <div className="rowItem__ownerPeek">
                  <span
                    className="rowItem__ownerPeekLink rowItem__ownerPeekLink--clientPlaceholder"
                    aria-hidden="true"
                  >
                    <DefaultAvatar
                      email={String(c.clientEmail || '').trim()}
                      fallback={String(c.clientName || '').trim() || clientProfileLine}
                      alt=""
                    />
                  </span>
                </div>
              )}
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

