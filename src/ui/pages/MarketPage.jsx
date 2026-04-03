import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, Input, Pill } from '../components.jsx'
import { normDigits, normVin } from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'

export default function MarketPage() {
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const [vin, setVin] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (mode !== 'owner' || !owner?.email) return <Navigate to="/auth" replace />

  const ownerEmail = owner.email
  const cars = r.listCars({ ownerEmail })
  const ownerClaims = r.listClaimsForOwner(ownerEmail)
  const pendingClaims = ownerClaims.filter((x) => x.status === 'pending')

  return (
    <div className="container">
      <div className="row spread gap">
        <div className="marketHead">
          <div className="marketHead__titleRow">
            <div className="row gap wrap" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <h1 className="h1" style={{ margin: 0 }}>
                Мой гараж
              </h1>
            </div>
            <div className="marketHead__actions row gap wrap">
              <Link className="btn" data-variant="ghost" to="/garage">
                Страница гаража
              </Link>
              <Link className="btn" data-variant="primary" to="/create">
                + Добавить авто
              </Link>
            </div>
          </div>
          <p className="muted">
            {cars.length} авто
            {owner?.isPremium ? (
              <>
                {' '}
                <Pill tone="accent">Premium</Pill>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/cars" />

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="cardTitle">Добавить авто по VIN</div>
        <p className="muted small">
          Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
        </p>
        <div className="row gap marketVinRow" style={{ marginTop: 10 }}>
          <Input
            className="input mono marketVinRow__input"
            placeholder="VIN…"
            value={vin}
            maxLength={17}
            onChange={(e) => setVin(normVin(e.target.value))}
          />
          <button
            className="btn marketVinRow__btn"
            data-variant="primary"
            onClick={() => {
              const v = normVin(vin)
              setVin(v)
              const res = r.findCarsByVin(v)
              setVinResults(res)
              if (!res.length) alert('В сервисе пока нет авто с таким VIN.')
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
                        disabled={alreadyMine}
                        onClick={() => {
                          const claim = r.createClaim({ carId: c.id, ownerEmail, evidence: ev })
                          if (claim?.error === 'already_pending') {
                            alert('Заявка уже отправлена и ждёт подтверждения.')
                            return
                          }
                          if (claim?.error) {
                            alert('Не удалось отправить заявку.')
                            return
                          }
                          invalidateRepo()
                          alert('Заявка отправлена в детейлинг на подтверждение.')
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
