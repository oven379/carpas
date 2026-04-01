import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, Input, Pill } from '../components.jsx'
import { fmtKm } from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'

function matches(car, q) {
  if (!q) return true
  const s = q.toLowerCase()
  return (
    car.vin?.toLowerCase().includes(s) ||
    car.plate?.toLowerCase().includes(s) ||
    car.make?.toLowerCase().includes(s) ||
    car.model?.toLowerCase().includes(s) ||
    String(car.year || '').includes(s) ||
    car.city?.toLowerCase().includes(s)
  )
}

export default function MarketPage() {
  const r = useRepo()
  const { detailingId, detailing, owner, mode } = useDetailing()
  const cars = mode === 'owner' ? r.listCars({ ownerEmail: owner?.email }) : r.listCars(detailingId)
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const q = sp.get('q') || ''
  const [vin, setVin] = useState('')

  const showSearch = mode !== 'owner' && cars.length > 0
  const filtered = useMemo(() => cars.filter((c) => matches(c, showSearch ? q : '')), [cars, q, showSearch])
  const ownerLimitHit = mode === 'owner' && cars.length >= 1
  const ownerClaims = mode === 'owner' ? r.listClaimsForOwner(owner?.email || '') : []
  const pendingClaims = ownerClaims.filter((x) => x.status === 'pending')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})
  const primaryCar = mode === 'owner' ? cars[0] || null : null
  const limitInfo =
    'Лимит MVP\n\n' +
    'В «Мой гараж» можно добавить 1 авто бесплатно. Чтобы добавить ещё — напишите в сервис.'

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <h1 className="h1">
            {mode === 'owner' ? 'Мой гараж' : mode === 'detailing' ? detailing?.name || 'Детейлинг' : 'Авто'}
          </h1>
          <p className="muted">
            {mode === 'owner' ? (
              <>Личный гараж • 1 авто бесплатно, дальше — по запросу в сервис.</>
            ) : mode === 'detailing' ? (
              <>Поиск по VIN/номеру/марке.</>
            ) : (
              'Поиск по VIN/номеру/марке/модели/городу.'
            )}
          </p>
        </div>
        <div className="row gap">
          {ownerLimitHit ? (
            <button
              className="btn"
              data-variant="primary"
              onClick={() => {
                alert(limitInfo)
              }}
            >
              + Добавить авто
            </button>
          ) : (
            <Link className="btn" data-variant="primary" to="/create">
              + Добавить авто
            </Link>
          )}
        </div>
      </div>

      {mode === 'owner' && primaryCar ? (
        <Link className="rowItem" to={`/car/${primaryCar.id}`} style={{ marginTop: 12 }}>
          <div
            className="rowItem__img"
            style={
              primaryCar.hero ? { backgroundImage: `url("${String(primaryCar.hero).replaceAll('"', '%22')}")` } : undefined
            }
          />
          <div className="rowItem__main">
            <div className="rowItem__title">
              {primaryCar.make} {primaryCar.model}
            </div>
            <div className="rowItem__meta">
              {primaryCar.city || '—'} • {fmtKm(primaryCar.mileageKm)} • {primaryCar.year}
            </div>
            <div className="rowItem__sub">Открыть карточку и историю обслуживания</div>
          </div>
          <div className="rowItem__aside">
            <div className="muted small">открыть →</div>
          </div>
        </Link>
      ) : null}

      {mode === 'owner' ? (
        <Card className="card pad" style={{ marginTop: 12 }}>
          <div className="cardTitle">Добавить авто по VIN</div>
          <p className="muted small">
            Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
          </p>
          <div className="row gap wrap" style={{ marginTop: 10 }}>
            <Input
              className="input mono"
              placeholder="VIN…"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
            />
            <button
              className="btn"
              data-variant="primary"
              onClick={() => {
                const res = r.findCarsByVin(vin)
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
                  const alreadyMine = (c.ownerEmail || '').toLowerCase() === (owner?.email || '').toLowerCase()
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
                            {c.year} • {c.city || '—'} • сервис: {c.seller?.name || '—'}
                          </div>
                        </div>
                        <button
                          className="btn"
                          data-variant="primary"
                          disabled={alreadyMine}
                          onClick={() => {
                            const claim = r.createClaim({ carId: c.id, ownerEmail: owner?.email, evidence: ev })
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
                              setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, year: e.target.value } }))
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
      ) : null}

      {showSearch ? (
        <Card className="card pad marketSearch">
          <div className="row gap wrap">
            <Input
              className="input"
              placeholder="Поиск… (например: Porsche / A777AA77 / VIN) — чтобы найти авто для нового визита"
              value={q}
              onChange={(e) => setSp({ q: e.target.value })}
            />
            <Pill tone="neutral">{filtered.length} найдено</Pill>
          </div>
        </Card>
      ) : null}

      <div className="list">
        {filtered.map((c) => (
          <Link
            key={c.id}
            className="rowItem"
            to={
              mode !== 'owner'
                ? `/car/${c.id}?from=${encodeURIComponent(`/cars${q ? `?q=${encodeURIComponent(q)}` : ''}`)}`
                : `/car/${c.id}`
            }
          >
            <div
              className="rowItem__img"
              style={c.hero ? { backgroundImage: `url("${String(c.hero).replaceAll('"', '%22')}")` } : undefined}
            />
            <div className="rowItem__main">
              <div className="rowItem__title">
                {c.make} {c.model}
              </div>
              <div className="rowItem__meta">
                {c.city || '—'} • {fmtKm(c.mileageKm)} • {c.year}
              </div>
              <div className="rowItem__sub">Сервис: {c.seller?.name || '—'}</div>
            </div>
            <div className="rowItem__aside">
              {mode !== 'owner' ? (
                <button
                  className="btn"
                  data-variant="primary"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const from = `/cars${q ? `?q=${encodeURIComponent(q)}` : ''}`
                    nav(`/car/${c.id}/history?new=1&from=${encodeURIComponent(from)}`)
                  }}
                  title="Быстро добавить визит"
                >
                  + Визит
                </button>
              ) : (
                <div className="muted small">открыть →</div>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Ничего не найдено. Попробуй другой запрос.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

