import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HttpError } from '../api/http.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { Button, Card, ComboBox, Input, PhoneRuInput, ServiceHint } from './components.jsx'
import {
  describeVinValidationError,
  formatPhoneRuInput,
  normDigits,
  normVin,
} from '../lib/format.js'
import { RUSSIAN_MILLION_PLUS_CITIES } from '../lib/russianMillionCities.js'
import { dedupeCarsById, OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../lib/garageLimits.js'
import { resolvedBackgroundImageUrl } from '../lib/mediaUrl.js'

function claimAlreadyPending(err) {
  if (!(err instanceof HttpError) || err.status !== 422) return false
  const carIdErr = err.body?.errors?.carId
  if (Array.isArray(carIdErr)) {
    return carIdErr.some((x) => String(x).includes('already_pending'))
  }
  return false
}

function normCityForMatch(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
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

function evidenceVerified(car, ev, evidenceMode) {
  if (evidenceMode === 'compact') {
    const yr = String(ev.year || '').trim()
    const yearOk = yr !== '' && String(car.year ?? '') === yr
    const c1 = normCityForMatch(ev.city)
    const c2 = normCityForMatch(car.city)
    const cityOk = c1 !== '' && c2 !== '' && c1 === c2
    return yearOk || cityOk
  }
  const mk = String(ev.make || '').trim().toLowerCase()
  const yr = String(ev.year || '').trim()
  const cl = String(ev.color || '').trim().toLowerCase()
  const makeOk = mk !== '' && mk === String(car.make || '').trim().toLowerCase()
  const yearOk = yr !== '' && String(car.year ?? '') === yr
  const colorOk =
    cl !== '' && cl === String(car.color || '').trim().toLowerCase()
  return makeOk && yearOk && colorOk
}

function phoneVerified(ev) {
  const p = formatPhoneRuInput(ev.phone || '')
  return p.length === 12
}

function buildClaimEvidence(car, ev, evidenceMode) {
  const verified = evidenceVerified(car, ev, evidenceMode)
  const phoneOk = phoneVerified(ev)
  if (!verified && !phoneOk) return null
  const base =
    evidenceMode === 'compact'
      ? {
          year: String(ev.year || '').trim(),
          city: String(ev.city || '').trim(),
        }
      : {
          make: String(ev.make || '').trim(),
          year: String(ev.year || '').trim(),
          color: String(ev.color || '').trim(),
        }
  if (!verified && phoneOk) {
    base.contactPhone = formatPhoneRuInput(ev.phone)
    base.verification = 'phone'
  } else {
    base.verification = 'facts'
  }
  return base
}

/**
 * Поиск авто по VIN и заявка на привязку к гаражу владельца.
 * Если переданы `cars` и `ownerClaims`, лишний запрос за списками не выполняется.
 *
 * Поиск на бэкенде: только карточки партнёрских сервисов (не «личный» кабинет детейлинга).
 */
export default function OwnerVinClaimSection({
  ownerEmail,
  sectionId = 'owner-vin-claim',
  className = '',
  style,
  cars: carsProp,
  ownerClaims: ownerClaimsProp,
  evidenceMode = 'compact',
  title: titleProp,
}) {
  const r = useRepo()
  const location = useLocation()
  const controlled = carsProp !== undefined && ownerClaimsProp !== undefined

  const [internalCars, setInternalCars] = useState([])
  const [internalClaims, setInternalClaims] = useState([])

  const createCarHref = useMemo(() => {
    const from = String(location?.pathname || '/garage') || '/garage'
    return `/create?from=${encodeURIComponent(from)}`
  }, [location?.pathname])

  useEffect(() => {
    if (controlled) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const [cl, claims] = await Promise.all([r.listCars(), r.listClaimsForOwner()])
        if (cancelled) return
        setInternalCars(dedupeCarsById(Array.isArray(cl) ? cl : []))
        setInternalClaims(Array.isArray(claims) ? claims : [])
      } catch {
        if (!cancelled) {
          setInternalCars([])
          setInternalClaims([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [controlled, r, r._version])

  const cars = controlled ? carsProp : internalCars
  const ownerClaims = controlled ? ownerClaimsProp : internalClaims

  const limits = useMemo(() => ownerGarageLimits(cars), [cars])
  const pendingClaims = useMemo(
    () => ownerClaims.filter((x) => x.status === 'pending'),
    [ownerClaims],
  )

  const [vin, setVin] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})
  const [searching, setSearching] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  const [showNoVinHits, setShowNoVinHits] = useState(false)

  const title =
    titleProp ?? (evidenceMode === 'full' ? 'Добавить авто по VIN' : 'Найти авто по VIN')

  const emptyEvidence = () =>
    evidenceMode === 'full'
      ? { make: '', year: '', color: '', phone: '' }
      : { year: '', city: '', phone: '' }

  useEffect(() => {
    setShowNoVinHits(false)
  }, [vin])

  async function refreshLocalLists() {
    if (controlled) {
      invalidateRepo()
      return
    }
    try {
      const [cl, claims] = await Promise.all([r.listCars(), r.listClaimsForOwner()])
      setInternalCars(dedupeCarsById(Array.isArray(cl) ? cl : []))
      setInternalClaims(Array.isArray(claims) ? claims : [])
    } catch {
      /* ignore */
    }
  }

  async function onSearch() {
    const v = normVin(vin)
    setVin(v)
    const vinErr = describeVinValidationError(v)
    if (vinErr) {
      alert(vinErr)
      setShowNoVinHits(false)
      return
    }
    setSearching(true)
    setShowNoVinHits(false)
    try {
      const res = await r.findCarsByVin(v)
      const list = Array.isArray(res) ? res : []
      setVinResults(list)
      setShowNoVinHits(list.length === 0)
      if (list.length > 0) setVin('')
    } catch {
      alert('Не удалось выполнить поиск. Проверьте интернет и что вы вошли в аккаунт.')
      setShowNoVinHits(false)
    } finally {
      setSearching(false)
    }
  }

  async function onSubmitClaim(car) {
    const ev = evidenceByCarId[car.id] || emptyEvidence()
    const payload = buildClaimEvidence(car, ev, evidenceMode)
    if (!payload) {
      alert(
        evidenceMode === 'compact'
          ? 'Совпадение не подтверждено: укажите верный год или город из карточки сервиса, либо полный номер телефона (+7 и 10 цифр).'
          : 'Совпадение не подтверждено: заполните марку, год и цвет как в карточке сервиса, либо укажите номер телефона (+7 и 10 цифр).',
      )
      return
    }
    setClaimingId(car.id)
    try {
      await r.createClaim({ carId: car.id, evidence: payload })
      invalidateRepo()
      await refreshLocalLists()
      alert('Заявка отправлена в детейлинг на подтверждение.')
    } catch (e) {
      if (claimAlreadyPending(e)) {
        alert('Заявка уже отправлена и ждёт подтверждения.')
        return
      }
      alert('Не удалось отправить заявку.')
    } finally {
      setClaimingId(null)
    }
  }

  const em = String(ownerEmail || '').trim()

  return (
    <Card id={sectionId} className={`card pad ${className}`.trim()} style={style}>
      <div
        id={`owner-vin-claim-hint-${sectionId}`}
        className="row gap wrap"
        style={{ alignItems: 'center' }}
      >
        <div className="cardTitle" style={{ margin: 0 }}>
          {title}
        </div>
        <ServiceHint
          scopeId={`owner-vin-claim-hint-${sectionId}`}
          variant="compact"
          label={evidenceMode === 'full' ? 'Справка: VIN' : 'Справка: найти авто по VIN'}
        >
          <p className="serviceHint__panelText">
            {evidenceMode === 'full' ? (
              <>
                Укажите полный VIN (17 символов, латиница и цифры) и подтвердите марку, год и цвет как в карточке сервиса — тогда
                кнопка «Запросить доступ» станет активной. Если не удаётся совпасть по данным, введите номер телефона в
                формате +7 и 10 цифр — заявка уйдёт с пометкой для проверки по телефону.
              </>
            ) : (
              <>
                Ищем только карточки, заведённые в кабинетах партнёрских сервисов (не «личные» кабинеты). Укажите VIN и
                подтвердите год выпуска и/или город как в карточке — кнопка «Отправить заявку» активируется. Если ни год,
                ни город не совпали, введите свой мобильный: префикс +7, затем 10 цифр (как в номере 9XXXXXXXXX) — номер
                сохранится для сверки на стороне сервиса.
              </>
            )}
          </p>
        </ServiceHint>
      </div>
      {!limits.canVinClaim ? (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          В гараже уже {limits.totalCount} из {OWNER_MAX_TOTAL_CARS} автомобилей — поиск авто по VIN недоступен.
        </p>
      ) : evidenceMode === 'full' ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
        </p>
      ) : null}
      <div className="row gap marketVinRow" style={{ marginTop: 10 }}>
        <Input
          className="input mono marketVinRow__input"
          placeholder="VIN…"
          value={vin}
          maxLength={17}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={!limits.canVinClaim || searching}
          onChange={(e) => setVin(normVin(e.target.value))}
        />
        <Button
          className="btn marketVinRow__btn"
          variant="primary"
          type="button"
          disabled={!limits.canVinClaim || searching}
          onClick={() => onSearch()}
        >
          {searching ? 'Поиск…' : 'Найти'}
        </Button>
      </div>

      {pendingClaims.length ? (
        <div className="topBorder">
          <div className="muted small">Заявки на модерации: {pendingClaims.length}</div>
        </div>
      ) : null}

      {showNoVinHits && limits.canVinClaim ? (
        <div className="topBorder ownerVinClaim__noHits">
          <p className="muted small" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
            Автомобиля с таким VIN в сервисе не найдено. Вы можете завести новую карточку в гараже — затем вести историю и
            документы самостоятельно.
          </p>
          <Link className="btn" data-variant="primary" to={createCarHref}>
            Добавить автомобиль
          </Link>
        </div>
      ) : null}

      {vinResults.length ? (
        <div className="topBorder">
          <div className="muted small" style={{ marginBottom: 10 }}>
            Найдено: {vinResults.length}
          </div>
          <div className="list">
            {vinResults.slice(0, 5).map((c) => {
              const alreadyMine = em && (c.ownerEmail || '').toLowerCase() === em.toLowerCase()
              const ev = evidenceByCarId[c.id] || emptyEvidence()
              const busy = claimingId === c.id
              const verified = evidenceVerified(c, ev, evidenceMode)
              const phoneOk = phoneVerified(ev)
              const canSubmit = verified || phoneOk
              const yearOpts = buildYearOptions(c.year)
              const heroBg = c.hero ? resolvedBackgroundImageUrl(c.hero) : undefined
              const partnerDetailingName = String(c.detailingName || c.seller?.name || '').trim()
              const showPartnerDetailing = Boolean(
                partnerDetailingName && (c.detailingId || String(c.detailingName || '').trim()),
              )
              return (
                <Card key={c.id} className="card pad vinNetworkHitCard">
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    {evidenceMode === 'full'
                      ? 'Подтвердите марку, год и цвет как в карточке сервиса — или укажите телефон ниже.'
                      : 'Подтвердите год и/или город как в карточке сервиса — или укажите телефон ниже.'}
                  </div>
                  <div className="vinNetworkHitCard__layout">
                    <div
                      className="vinNetworkHitCard__hero"
                      style={heroBg ? { backgroundImage: heroBg } : undefined}
                      aria-hidden={c.hero ? undefined : true}
                    />
                    <div className="vinNetworkHitCard__body">
                      <div className="row spread gap wrap">
                        <div style={{ minWidth: 0 }}>
                          <div className="rowItem__title">
                            {c.make} {c.model}
                          </div>
                          <div className="rowItem__meta mono" style={{ marginTop: 4 }}>
                            VIN: {c.vin || '—'}
                          </div>
                          {showPartnerDetailing ? (
                            <div className="rowItem__meta muted small" style={{ marginTop: 6, lineHeight: 1.45 }}>
                              Сервис: {partnerDetailingName}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          className="btn"
                          variant="primary"
                          type="button"
                          disabled={alreadyMine || !limits.canVinClaim || busy || !canSubmit}
                          onClick={() => onSubmitClaim(c)}
                        >
                          {busy ? 'Отправка…' : alreadyMine ? 'Уже в гараже' : evidenceMode === 'full' ? 'Запросить доступ' : 'Отправить заявку'}
                        </Button>
                      </div>

                      <div className="formGrid" style={{ marginTop: 10 }}>
                    {evidenceMode === 'full' ? (
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Марка (как в карточке)</span>
                        </div>
                        <Input
                          className="input"
                          value={ev.make}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, make: e.target.value } }))
                          }
                          placeholder="Например: Volkswagen"
                        />
                      </div>
                    ) : null}
                    <div className="field">
                      <div className="field__top">
                        <span className="field__label">Год выпуска</span>
                      </div>
                      {evidenceMode === 'compact' ? (
                        <ComboBox
                          value={ev.year}
                          options={yearOpts}
                          placeholder="Выберите или введите год"
                          onChange={(v) =>
                            setEvidenceByCarId((m) => ({
                              ...m,
                              [c.id]: {
                                ...ev,
                                year: normDigits(String(v), { max: 2100, maxLen: 4 }),
                              },
                            }))
                          }
                        />
                      ) : (
                        <ComboBox
                          value={ev.year}
                          options={yearOpts}
                          placeholder="Выберите или введите год"
                          onChange={(v) =>
                            setEvidenceByCarId((m) => ({
                              ...m,
                              [c.id]: {
                                ...ev,
                                year: normDigits(String(v), { max: 2100, maxLen: 4 }),
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                    {evidenceMode === 'compact' ? (
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Город</span>
                        </div>
                        <ComboBox
                          value={ev.city}
                          options={RUSSIAN_MILLION_PLUS_CITIES}
                          placeholder="Как в карточке сервиса; можно ввести свой вариант"
                          maxItems={24}
                          onChange={(v) =>
                            setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, city: v } }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Цвет</span>
                        </div>
                        <Input
                          className="input"
                          value={ev.color}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, color: e.target.value } }))
                          }
                          placeholder="Например: Чёрный"
                        />
                      </div>
                    )}
                    {!verified ? (
                      <div className="field field--full">
                        <div className="field__top">
                          <span className="field__label">Телефон для проверки</span>
                        </div>
                        <p className="muted small" style={{ margin: '0 0 8px', lineHeight: 1.45 }}>
                          Если год{evidenceMode === 'compact' ? ', город' : ''} не совпали с карточкой, введите номер: после
                          +7 должно быть 10 цифр (например вводите как 9887654321 — отобразится в формате +7…).
                        </p>
                        <PhoneRuInput
                          className="mono"
                          value={ev.phone || ''}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({
                              ...m,
                              [c.id]: { ...ev, phone: formatPhoneRuInput(e.target.value) },
                            }))
                          }
                          onBlur={() =>
                            setEvidenceByCarId((m) => {
                              const cur = m[c.id]
                              return {
                                ...m,
                                [c.id]: { ...cur, phone: formatPhoneRuInput(cur?.phone || '') },
                              }
                            })
                          }
                          autoComplete="tel"
                        />
                      </div>
                    ) : null}
                  </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
