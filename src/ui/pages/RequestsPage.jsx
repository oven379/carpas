import { Navigate } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, Pill } from '../components.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

function eqNorm(a, b) {
  const x = String(a || '').trim().toLowerCase()
  const y = String(b || '').trim().toLowerCase()
  if (!x || !y) return null
  return x === y
}

export default function RequestsPage() {
  const r = useRepo()
  const { detailingId, detailing, mode } = useDetailing()
  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />

  const claims = r.listClaimsForDetailing(detailingId)
  const pending = claims.filter((x) => x.status === 'pending')

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Заявки</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              Заявки на привязку авто
            </h1>
          </div>
          <p className="muted">
            Детейлинг: <span className="mono">{detailing?.name || detailingId}</span> · в ожидании: {pending.length}
          </p>
        </div>
      </div>

      <div className="list">
        {claims.map((x) => {
          const car = r.getCar(x.carId, { detailingId })
          const ev = x.evidence || {}
          const mMake = eqNorm(ev.make, car?.make)
          const mYear = eqNorm(ev.year, car?.year)
          const mColor = eqNorm(ev.color, car?.color)
          return (
            <Card key={x.id} className="card pad">
              <div className="row spread gap">
                <div>
                  <div className="row gap wrap">
                    <div className="rowItem__title">
                      {car ? `${car.make} ${car.model}` : 'Авто'}
                    </div>
                    <Pill tone={x.status === 'pending' ? 'accent' : 'neutral'}>
                      {x.status === 'pending' ? 'ожидает' : x.status === 'approved' ? 'подтверждено' : 'отклонено'}
                    </Pill>
                  </div>
                  <div className="rowItem__sub">Владелец: {x.ownerEmail}</div>
                  {car?.vin ? <div className="muted small">VIN: {car.vin}</div> : null}
                  <div className="topBorder">
                    <div className="muted small" style={{ marginBottom: 6 }}>
                      Подтверждающие признаки (от владельца)
                    </div>
                    <div className="row gap wrap">
                      <Pill tone={mMake == null ? 'neutral' : mMake ? 'accent' : 'neutral'}>
                        Марка: {ev.make || '—'} {mMake === true ? '✓' : mMake === false ? '✕' : ''}
                      </Pill>
                      <Pill tone={mYear == null ? 'neutral' : mYear ? 'accent' : 'neutral'}>
                        Год: {ev.year || '—'} {mYear === true ? '✓' : mYear === false ? '✕' : ''}
                      </Pill>
                      <Pill tone={mColor == null ? 'neutral' : mColor ? 'accent' : 'neutral'}>
                        Цвет: {ev.color || '—'} {mColor === true ? '✓' : mColor === false ? '✕' : ''}
                      </Pill>
                    </div>
                    {car ? (
                      <div className="muted small" style={{ marginTop: 8 }}>
                        В базе сервиса: {car.make || '—'}, {car.year || '—'}, {car.color || '—'}
                      </div>
                    ) : null}
                  </div>
                </div>
                {x.status === 'pending' ? (
                  <div className="row gap">
                    <button
                      className="btn"
                      data-variant="primary"
                      onClick={() => {
                        const done = r.reviewClaim(x.id, { status: 'approved' })
                        if (!done) {
                          alert('Не удалось подтвердить заявку.')
                          return
                        }
                        invalidateRepo()
                      }}
                    >
                      Подтвердить
                    </button>
                    <button
                      className="btn"
                      data-variant="danger"
                      onClick={() => {
                        const done = r.reviewClaim(x.id, { status: 'rejected' })
                        if (!done) {
                          alert('Не удалось отклонить заявку.')
                          return
                        }
                        invalidateRepo()
                      }}
                    >
                      Отклонить
                    </button>
                  </div>
                ) : null}
              </div>
            </Card>
          )
        })}
        {claims.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Заявок пока нет.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

