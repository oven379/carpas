import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HttpError } from '../api/http.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { Button, Card, CityComboBox, ComboBox, Input, PhoneRuInput, ServiceHint } from './components.jsx'
import { SupportButton } from './support/SupportHub.jsx'
import {
  CITY_FIELD_DD_HINT,
  describeVinValidationError,
  formatPhoneRuInput,
  normDigits,
  normVin,
} from '../lib/format.js'
import { dedupeCarsById, OWNER_MAX_FREE_GARAGE_CARS, ownerGarageLimits } from '../lib/garageLimits.js'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../lib/supportTicketPresets.js'
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
 * Поиск авто по VIN в карточках партнёрских сервисов и заявка на привязку к гаражу владельца.
 * Если переданы `cars` и `ownerClaims`, лишний запрос за списками не выполняется.
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
  const { owner } = useDetailing()
  const location = useLocation()
  const navigate = useNavigate()
  const controlled = carsProp !== undefined && ownerClaimsProp !== undefined

  const [internalCars, setInternalCars] = useState([])
  const [internalClaims, setInternalClaims] = useState([])

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

  const limits = useMemo(
    () => ownerGarageLimits(cars, { isPremium: Boolean(owner?.isPremium) }),
    [cars, owner?.isPremium],
  )
  const pendingClaims = useMemo(
    () => ownerClaims.filter((x) => x.status === 'pending'),
    [ownerClaims],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})
  const [searching, setSearching] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  /** После успешной отправки заявки или если заявка уже была — модалка + переход в гараж по «Хорошо». */
  const [postClaimNotice, setPostClaimNotice] = useState(null)
  const [showNoVinHits, setShowNoVinHits] = useState(false)
  /** После успешного поиска строка очищается — для «Добавить автомобиль» помним VIN запроса. */
  const [lastClaimSearchVin, setLastClaimSearchVin] = useState('')
  const searchSeqRef = useRef(0)

  const createCarHref = useMemo(() => {
    const from = String(location?.pathname || '/garage') || '/garage'
    const p = new URLSearchParams()
    p.set('from', from)
    const v = normVin(searchQuery) || lastClaimSearchVin
    if (v) p.set('vin', v)
    return `/create?${p.toString()}`
  }, [location?.pathname, searchQuery, lastClaimSearchVin])

  const title = titleProp ?? (evidenceMode === 'full' ? 'Добавить авто по VIN' : 'Найти авто по VIN')

  const emptyEvidence = () =>
    evidenceMode === 'full'
      ? { make: '', year: '', color: '', phone: '' }
      : { year: '', city: '', phone: '' }

  useEffect(() => {
    setShowNoVinHits(false)
  }, [searchQuery])

  function resetOwnerClaimSearch() {
    searchSeqRef.current += 1
    setSearching(false)
    setSearchQuery('')
    setLastClaimSearchVin('')
    setVinResults([])
    setEvidenceByCarId({})
    setShowNoVinHits(false)
  }

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
    const vin = normVin(searchQuery)
    if (!vin) {
      alert('Введите VIN код вашего авто (17 символов латиницы и цифр).')
      setShowNoVinHits(false)
      return
    }
    const vinErr = describeVinValidationError(vin)
    if (vinErr) {
      alert(vinErr)
      setShowNoVinHits(false)
      return
    }
    const seq = ++searchSeqRef.current
    setSearching(true)
    setShowNoVinHits(false)
    try {
      const res = await r.findCarsByVin(vin)
      if (seq !== searchSeqRef.current) return
      const list = Array.isArray(res) ? res : []
      setLastClaimSearchVin(vin)
      setVinResults(list)
      setShowNoVinHits(list.length === 0)
      if (list.length > 0) setSearchQuery('')
    } catch {
      if (seq !== searchSeqRef.current) return
      alert('Не удалось выполнить поиск. Проверьте интернет и что вы вошли в аккаунт.')
      setShowNoVinHits(false)
    } finally {
      if (seq === searchSeqRef.current) setSearching(false)
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
      setPostClaimNotice('sent')
    } catch (e) {
      if (claimAlreadyPending(e)) {
        invalidateRepo()
        await refreshLocalLists()
        setPostClaimNotice('duplicate')
        return
      }
      alert('Не удалось отправить заявку.')
    } finally {
      setClaimingId(null)
    }
  }

  const closePostClaimAndGoGarage = () => {
    setPostClaimNotice(null)
    navigate('/garage')
  }

  const em = String(ownerEmail || '').trim()

  const postClaimModal =
    postClaimNotice && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="supportModalOverlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-vin-claim-post-title"
          >
            <div className="supportModal card pad">
              <h2 id="owner-vin-claim-post-title" className="h2 supportModal__title">
                {postClaimNotice === 'sent' ? 'Заявка отправлена' : 'Заявка уже отправлена'}
              </h2>
              <p className="supportModal__lead" style={{ marginTop: 12 }}>
                {postClaimNotice === 'sent' ? (
                  <>
                    Когда вы получите одобрение от детейлинга или СТО, машина появится у вас в гараже.
                  </>
                ) : (
                  <>
                    По этому авто заявка уже была направлена в сервис и ждёт решения. После одобрения детейлинга или СТО машина
                    появится у вас в гараже.
                  </>
                )}
              </p>
              <div className="supportModal__submitRow">
                <Button className="btn" variant="primary" type="button" onClick={closePostClaimAndGoGarage}>
                  Хорошо
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {postClaimModal}
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
          label={evidenceMode === 'full' ? 'Справка: VIN' : 'Справка: поиск по VIN'}
        >
          <p className="serviceHint__panelText">
            {evidenceMode === 'full' ? (
              <>
                Введите полный VIN (17 символов) и нажмите «Найти». Затем подтвердите марку, год и цвет как в карточке сервиса — тогда
                кнопка «Запросить доступ» станет активной. Если не удаётся совпасть по данным, введите номер телефона в
                формате +7 и 10 цифр — заявка уйдёт с пометкой для проверки по телефону. Лимит «до {OWNER_MAX_FREE_GARAGE_CARS} авто»
                в личном гараже не ограничивает кабинет партнёра: детейлинг может вести любое число карточек у себя.
              </>
            ) : (
              <>
                В строке поиска укажите только VIN (17 символов). Ищем карточки партнёрских сервисов (не личный гараж). После
                нахождения авто подтвердите год и/или город как в карточке — или укажите свой телефон (+7 и 10 цифр) для сверки у
                сервиса. Лимит «до {OWNER_MAX_FREE_GARAGE_CARS} авто» относится только к вашему гаражу; у детейлинга в кабинете
                партнёра ограничений на число карточек клиентов нет.
              </>
            )}
          </p>
        </ServiceHint>
      </div>
      {!limits.canVinClaim ? (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          В гараже уже {limits.totalCount} из {OWNER_MAX_FREE_GARAGE_CARS} бесплатных мест — привязка ещё одного авто по VIN
          недоступна. Оформите Premium через кнопку «Добавить автомобиль» ниже или в гараже.
        </p>
      ) : evidenceMode === 'full' ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
        </p>
      ) : null}
      <div className="row gap wrap marketVinRow" style={{ marginTop: 10, alignItems: 'center' }}>
        <Input
          className="input marketVinRow__input"
          placeholder="Введите VIN код вашего авто"
          value={searchQuery}
          maxLength={17}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={!limits.canVinClaim || searching}
          onChange={(e) => setSearchQuery(normVin(e.target.value))}
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
        <Button
          className="btn marketVinRow__btn"
          variant="ghost"
          type="button"
          disabled={!limits.canVinClaim}
          onClick={() => resetOwnerClaimSearch()}
        >
          Отменить
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
            По этому VIN карточка в сервисе не найдена. Проверьте номер и что детейлинг уже завёл авто у себя. Можно завести
            новую карточку в гараже и вести историю самостоятельно.
          </p>
          {limits.canAddManual ? (
            <Link className="btn" data-variant="primary" to={createCarHref}>
              Добавить автомобиль
            </Link>
          ) : (
            <SupportButton className="btn" data-variant="primary" openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}>
              Добавить автомобиль
            </SupportButton>
          )}
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
                      <div className="field serviceHint__fieldWrap" id={`owner-vin-claim-city-${c.id}`}>
                        <div className="field__top serviceHint__fieldTop">
                          <span className="field__label">Город</span>
                          <ServiceHint
                            scopeId={`owner-vin-claim-city-${c.id}`}
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
    </>
  )
}
