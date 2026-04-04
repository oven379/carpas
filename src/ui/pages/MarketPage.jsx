import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { HttpError } from '../../api/http.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { OWNER_MAX_MANUAL_CARS, OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'
import { Card, Input, Pill, ServiceHint } from '../components.jsx'
import { normDigits, normVin } from '../../lib/format.js'
import { getSessionOwner, hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'

function claimAlreadyPending(err) {
  if (!(err instanceof HttpError) || err.status !== 422) return false
  const carIdErr = err.body?.errors?.carId
  if (Array.isArray(carIdErr)) {
    return carIdErr.some((x) => String(x).includes('already_pending'))
  }
  return false
}

export default function MarketPage() {
  const r = useRepo()
  const loc = useLocation()
  const { owner, mode } = useDetailing()
  const ownerEmail = String(owner?.email || getSessionOwner()?.email || '').trim()
  const [vin, setVin] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})
  const [cars, setCars] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])

  useEffect(() => {
    if (loc.hash !== '#owner-vin-claim') return
    const t = window.setTimeout(() => {
      document.getElementById('owner-vin-claim')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [loc.hash, loc.pathname])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasOwnerSession()) {
        setCars([])
        setOwnerClaims([])
        return
      }
      try {
        const [cl, claims] = await Promise.all([r.listCars(), r.listClaimsForOwner()])
        if (cancelled) return
        setCars(Array.isArray(cl) ? cl : [])
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
  }, [r, r._version, ownerEmail])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />

  const limits = ownerGarageLimits(cars)
  const pendingClaims = ownerClaims.filter((x) => x.status === 'pending')

  return (
    <div className="container">
      <div className="row spread gap">
        <div className="marketHead">
          <div className="marketHead__titleRow">
            <div id="market-cars-hint" className="row gap wrap" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <h1 className="h1" style={{ margin: 0 }}>
                Мои автомобили
              </h1>
              <ServiceHint scopeId="market-cars-hint" variant="compact" label="Справка: список авто">
                <p className="serviceHint__panelText">
                  Здесь карточки и история по каждой машине. Профиль, баннер и публичная витрина по ссылке <span className="mono">/g/…</span>{' '}
                  — в разделе «Гараж». Кнопка «Добавить авто» может быть недоступна при лимите гаража.
                </p>
              </ServiceHint>
            </div>
            <div className="marketHead__actions row gap wrap">
              <Link className="btn" data-variant="ghost" to="/garage">
                В гараж
              </Link>
              {limits.canAddManual ? (
                <Link className="btn" data-variant="primary" to="/create">
                  + Добавить авто
                </Link>
              ) : (
                <span
                  className="btn btn--asDisabled"
                  data-variant="primary"
                  title={
                    limits.totalCount >= OWNER_MAX_TOTAL_CARS
                      ? `Не больше ${OWNER_MAX_TOTAL_CARS} авто в гараже`
                      : `Вручную не больше ${OWNER_MAX_MANUAL_CARS} авто`
                  }
                >
                  + Добавить авто
                </span>
              )}
            </div>
          </div>
          <div className="muted" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span>Карточки, история визитов, заявка по VIN</span>
            <span aria-hidden="true"> · </span>
            <span>{cars.length} авто</span>
            {owner?.isPremium ? <Pill tone="accent">Premium</Pill> : null}
          </div>
        </div>
      </div>

      <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/cars" />

      <Card id="owner-vin-claim" className="card pad" style={{ marginTop: 12 }}>
        <div className="row gap wrap" style={{ alignItems: 'center' }}>
          <div className="cardTitle" style={{ margin: 0 }}>
            Добавить авто по VIN
          </div>
          <ServiceHint scopeId="market-vin-claim-hint" variant="compact" label="Справка: VIN">
            <p className="serviceHint__panelText">
              Если детейлинг уже вёл карточку, укажите VIN и подтвердите признаки авто — заявка уйдёт на модерацию.
            </p>
          </ServiceHint>
        </div>
        {!limits.canVinClaim ? (
          <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
            В гараже уже {limits.totalCount} из {OWNER_MAX_TOTAL_CARS} автомобилей — поиск по VIN недоступен.
          </p>
        ) : (
          <p className="muted small" style={{ marginTop: 8 }}>
            Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
          </p>
        )}
        <div className="row gap marketVinRow" style={{ marginTop: 10 }}>
          <Input
            className="input mono marketVinRow__input"
            placeholder="VIN…"
            value={vin}
            maxLength={17}
            disabled={!limits.canVinClaim}
            onChange={(e) => setVin(normVin(e.target.value))}
          />
          <button
            className="btn marketVinRow__btn"
            data-variant="primary"
            type="button"
            disabled={!limits.canVinClaim}
            onClick={async () => {
              const v = normVin(vin)
              setVin(v)
              try {
                const res = await r.findCarsByVin(v)
                setVinResults(Array.isArray(res) ? res : [])
                if (!res?.length) alert('В сервисе пока нет авто с таким VIN.')
              } catch {
                alert('Не удалось выполнить поиск. Проверьте сеть и авторизацию.')
              }
            }}
          >
            Найти
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
                const alreadyMine = (c.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
                const ev = evidenceByCarId[c.id] || { make: '', year: '', color: '' }
                return (
                  <Card key={c.id} className="card pad">
                    <div className="muted small" style={{ marginBottom: 10 }}>
                      Подтвердите признаки авто (марка/год/цвет) — это уйдёт на модерацию в детейлинг.
                    </div>
                    <div className="row spread gap">
                      <div>
                        <div className="rowItem__title">
                          {c.make} {c.model}
                        </div>
                        <div className="rowItem__meta">
                          {c.year} · {c.city || '—'} · сервис: {c.seller?.name || '—'}
                        </div>
                      </div>
                      <button
                        className="btn"
                        data-variant="primary"
                        type="button"
                        disabled={alreadyMine || !limits.canVinClaim}
                        onClick={async () => {
                          try {
                            await r.createClaim({ carId: c.id, evidence: ev })
                            invalidateRepo()
                            const claims = await r.listClaimsForOwner()
                            setOwnerClaims(Array.isArray(claims) ? claims : [])
                            alert('Заявка отправлена в детейлинг на подтверждение.')
                          } catch (e) {
                            if (claimAlreadyPending(e)) {
                              alert('Заявка уже отправлена и ждёт подтверждения.')
                              return
                            }
                            alert('Не удалось отправить заявку.')
                          }
                        }}
                      >
                        {alreadyMine ? 'Уже в гараже' : 'Запросить доступ'}
                      </button>
                    </div>

                    <div className="formGrid" style={{ marginTop: 10 }}>
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
    </div>
  )
}
