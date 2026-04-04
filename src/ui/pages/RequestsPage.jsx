import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, Pill, ServiceHint } from '../components.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

function eqNorm(a, b) {
  const x = String(a || '').trim().toLowerCase()
  const y = String(b || '').trim().toLowerCase()
  if (!x || !y) return null
  return x === y
}

export default function RequestsPage() {
  const r = useRepo()
  const loc = useLocation()
  const { detailingId, detailing, mode } = useDetailing()
  const [claims, setClaims] = useState([])
  const [carsById, setCarsById] = useState({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (mode !== 'detailing' || !detailingId) {
        setClaims([])
        setCarsById({})
        setReady(true)
        return
      }
      setReady(false)
      try {
        const [cl, carList] = await Promise.all([r.listClaimsForDetailing(), r.listCars()])
        if (cancelled) return
        setClaims(Array.isArray(cl) ? cl : [])
        const map = {}
        for (const car of Array.isArray(carList) ? carList : []) {
          map[String(car.id)] = car
        }
        setCarsById(map)
      } catch {
        if (!cancelled) {
          setClaims([])
          setCarsById({})
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, mode, detailingId])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />

  const pending = claims.filter((x) => x.status === 'pending')

  if (!ready) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Заявки</span>
          </div>
          <div id="requests-page-hint" className="serviceHint__pageBlock">
            <div className="serviceHint__pageBlockRow row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav />
              <h1 className="h1">Заявки на привязку авто</h1>
              <ServiceHint scopeId="requests-page-hint" variant="compact" label="Справка: заявки">
                <p className="serviceHint__panelText">
                  Владельцы запрашивают привязку авто к вашему кабинету. Проверьте совпадение данных и подтвердите или отклоните заявку.
                </p>
              </ServiceHint>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Детейлинг: <span className="mono">{detailing?.name || detailingId}</span> · в ожидании: {pending.length}
          </p>
        </div>
      </div>

      <div className="list">
        {claims.map((x) => {
          const car = carsById[String(x.carId)] || null
          const ev = x.evidence || {}
          const mYear = eqNorm(ev.year, car?.year)
          const mColor = eqNorm(ev.color, car?.color)
          const claimOwner = typeof r.getOwner === 'function' ? r.getOwner(x.ownerEmail) : null
          const ownerGarageSlug = String(claimOwner?.garageSlug || '').trim()
          const ownerAvatar = String(claimOwner?.garageAvatar || '').trim()
          const ownerLabel = String(claimOwner?.name || '').trim() || String(x.ownerEmail || 'Владелец').trim()
          const ownerInitial = (ownerLabel.slice(0, 2) || '?').toUpperCase()
          return (
            <Card key={x.id} className="card pad">
              <div className="row spread gap requestsCard__row">
                <div className="requestsCard__body">
                  <div className="row gap wrap">
                    <div className="rowItem__title">
                      {car ? `${car.make} ${car.model}` : 'Авто'}
                    </div>
                    <Pill
                      tone={x.status === 'pending' ? 'accent' : x.status === 'approved' ? 'accent' : 'neutral'}
                      className="pill--statusRing"
                    >
                      {x.status === 'pending' ? 'ожидает' : x.status === 'approved' ? 'подтверждено' : 'отклонено'}
                    </Pill>
                  </div>
                  <div className="requestsCard__ownerBlock">
                    <div
                      className="requestsCard__ownerAvatar"
                      title={ownerLabel}
                      aria-label={ownerLabel}
                    >
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" />
                      ) : (
                        <span className="requestsCard__ownerAvatarFallback" aria-hidden="true">
                          {ownerInitial}
                        </span>
                      )}
                    </div>
                    <div className="requestsCard__ownerMeta">
                      <div className="rowItem__sub requestsCard__ownerLine">
                        <span className="requestsCard__ownerLineLabel">Владелец:</span>{' '}
                        {ownerGarageSlug ? (
                          <>
                            <span className="mono requestsCard__ownerPlain">{x.ownerEmail}</span>
                            <span className="requestsCard__ownerLineSep" aria-hidden="true">
                              {' '}
                              ·{' '}
                            </span>
                            <Link
                              className="requestsCard__ownerPublicLink"
                              to={`/g/${encodeURIComponent(ownerGarageSlug)}`}
                              state={{ from: `${loc.pathname}${loc.search}` }}
                            >
                              ссылка аккаунта владельца авто
                            </Link>
                          </>
                        ) : (
                          <span
                            className="requestsCard__ownerPlain"
                            title="Публичная страница гаража не задана — указан только аккаунт"
                          >
                            <span className="requestsCard__carpasIdTag mono muted">carpas/id:</span>{' '}
                            <span className="mono">{x.ownerEmail}</span>
                          </span>
                        )}
                      </div>
                      {car?.vin ? (
                        <div className="muted small requestsCard__vin">VIN: {car.vin}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="topBorder">
                    <div className="muted small" style={{ marginBottom: 6 }}>
                      Подтверждающие признаки (от владельца)
                    </div>
                    <div className="row gap wrap">
                      <Pill tone={mYear == null ? 'neutral' : mYear ? 'accent' : 'neutral'}>
                        Год: {ev.year || '—'} {mYear === true ? '✓' : mYear === false ? '✕' : ''}
                      </Pill>
                      <Pill tone={mColor == null ? 'neutral' : mColor ? 'accent' : 'neutral'}>
                        Цвет: {ev.color || '—'} {mColor === true ? '✓' : mColor === false ? '✕' : ''}
                      </Pill>
                    </div>
                    {car ? (
                      <div className="muted small" style={{ marginTop: 8 }}>
                        В базе сервиса: год {car.year || '—'}, цвет {car.color || '—'}
                      </div>
                    ) : null}
                  </div>
                </div>
                {x.status === 'pending' ? (
                  <div className="row gap">
                    <button
                      className="btn"
                      data-variant="primary"
                      type="button"
                      onClick={async () => {
                        try {
                          await r.reviewClaim(x.id, { status: 'approved' })
                          invalidateRepo()
                          const [cl, carList] = await Promise.all([r.listClaimsForDetailing(), r.listCars()])
                          setClaims(Array.isArray(cl) ? cl : [])
                          const map = {}
                          for (const c of Array.isArray(carList) ? carList : []) {
                            map[String(c.id)] = c
                          }
                          setCarsById(map)
                        } catch {
                          alert('Не удалось подтвердить заявку.')
                        }
                      }}
                    >
                      Подтвердить
                    </button>
                    <button
                      className="btn"
                      data-variant="danger"
                      type="button"
                      onClick={async () => {
                        try {
                          await r.reviewClaim(x.id, { status: 'rejected' })
                          invalidateRepo()
                          const [cl, carList] = await Promise.all([r.listClaimsForDetailing(), r.listCars()])
                          setClaims(Array.isArray(cl) ? cl : [])
                          const map = {}
                          for (const c of Array.isArray(carList) ? carList : []) {
                            map[String(c.id)] = c
                          }
                          setCarsById(map)
                        } catch {
                          alert('Не удалось отклонить заявку.')
                        }
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
