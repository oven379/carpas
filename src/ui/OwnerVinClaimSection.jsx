import { useEffect, useMemo, useState } from 'react'
import { HttpError } from '../api/http.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { Card, Input, ServiceHint } from './components.jsx'
import { describeVinValidationError, fmtKm, normDigits, normVin } from '../lib/format.js'
import { dedupeCarsById, OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../lib/garageLimits.js'

function claimAlreadyPending(err) {
  if (!(err instanceof HttpError) || err.status !== 422) return false
  const carIdErr = err.body?.errors?.carId
  if (Array.isArray(carIdErr)) {
    return carIdErr.some((x) => String(x).includes('already_pending'))
  }
  return false
}

/**
 * Поиск авто по VIN и заявка на привязку к гаражу владельца.
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

  const title =
    titleProp ?? (evidenceMode === 'full' ? 'Добавить авто по VIN' : 'Найти авто по VIN')

  const emptyEvidence = () =>
    evidenceMode === 'full' ? { make: '', year: '', color: '' } : { year: '', color: '' }

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
      return
    }
    setSearching(true)
    try {
      const res = await r.findCarsByVin(v)
      const list = Array.isArray(res) ? res : []
      setVinResults(list)
      if (!list.length) alert('В сервисе пока нет авто с таким VIN.')
    } catch {
      alert('Не удалось выполнить поиск. Проверьте сеть и авторизацию.')
    } finally {
      setSearching(false)
    }
  }

  async function onSubmitClaim(car) {
    const ev = evidenceByCarId[car.id] || emptyEvidence()
    setClaimingId(car.id)
    try {
      await r.createClaim({ carId: car.id, evidence: ev })
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
                Если детейлинг уже вёл карточку, укажите полный VIN (17 символов, без I/O/Q, с верным контрольным знаком в
                9-й позиции) и подтвердите признаки авто — заявка уйдёт на модерацию в детейлинг.
              </>
            ) : (
              <>
                Если детейлинг уже вёл карточку, укажите полный VIN (17 символов, без I/O/Q, с верным контрольным знаком) и
                подтвердите год и цвет — заявка уйдёт на проверку. После
                одобрения машина появится в вашем гараже: вы сможете вести свою историю и документы; редактировать саму
                карточку (марка, VIN, обложка и т.д.) можно только в сервисе.
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
          disabled={!limits.canVinClaim || searching}
          onChange={(e) => setVin(normVin(e.target.value))}
        />
        <button
          className="btn marketVinRow__btn"
          data-variant="primary"
          type="button"
          disabled={!limits.canVinClaim || searching}
          onClick={() => void onSearch()}
        >
          {searching ? 'Поиск…' : 'Найти'}
        </button>
      </div>

      {pendingClaims.length ? (
        <div className="topBorder">
          <div className="muted small">Заявки на модерации: {pendingClaims.length}</div>
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
              return (
                <Card key={c.id} className="card pad">
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    {evidenceMode === 'full'
                      ? 'Подтвердите признаки авто (марка/год/цвет) — это уйдёт на модерацию в детейлинг.'
                      : 'Подтвердите год и цвет — детейлинг сверит с карточкой (марка и модель уже указаны выше).'}
                  </div>
                  <div className="row spread gap">
                    <div>
                      <div className="rowItem__title">
                        {c.make} {c.model}
                      </div>
                      <div className="rowItem__meta">
                        {evidenceMode === 'full' ? (
                          <>
                            {c.year} · {c.city || '—'} · сервис: {c.seller?.name || '—'}
                          </>
                        ) : (
                          <>
                            {fmtKm(c.mileageKm)} · {c.city || '—'} · сервис: {c.seller?.name || '—'}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn"
                      data-variant="primary"
                      type="button"
                      disabled={alreadyMine || !limits.canVinClaim || busy}
                      onClick={() => void onSubmitClaim(c)}
                    >
                      {busy ? 'Отправка…' : alreadyMine ? 'Уже в гараже' : evidenceMode === 'full' ? 'Запросить доступ' : 'Отправить заявку'}
                    </button>
                  </div>

                  <div className="formGrid" style={{ marginTop: 10 }}>
                    {evidenceMode === 'full' ? (
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Марка</span>
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
                        <span className="field__label">Год</span>
                      </div>
                      <Input
                        className="input"
                        inputMode="numeric"
                        value={ev.year}
                        onChange={(e) =>
                          setEvidenceByCarId((m) => ({
                            ...m,
                            [c.id]: { ...ev, year: normDigits(e.target.value, { max: 2100, maxLen: 4 }) },
                          }))
                        }
                        placeholder="Например: 2019"
                      />
                    </div>
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
