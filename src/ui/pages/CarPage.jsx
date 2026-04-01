import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, Pill } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { useDetailing } from '../useDetailing.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'

export default function CarPage() {
  const { id } = useParams()
  const r = useRepo()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [washIdx, setWashIdx] = useState(0)
  const { detailingId, detailing, owner, mode } = useDetailing()
  const scope = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = r.getCar(id, scope)

  const washPhotos = useMemo(() => {
    if (!car) return []
    return Array.isArray(car.washPhotos) ? car.washPhotos : car.washPhoto ? [car.washPhoto] : []
  }, [car])

  const washPhotosKey = useMemo(() => washPhotos.join('|'), [washPhotos])

  useEffect(() => {
    setWashIdx(0)
  }, [washPhotosKey])

  if (!car) return <Navigate to="/cars" replace />

  const fromRaw = sp.get('from') || ''
  const ownerCars =
    mode === 'owner' && owner?.email ? r.listCars({ ownerEmail: owner.email }) : []
  const defaultGarage = mode === 'owner' && ownerCars.length >= 1 ? '/cars?hub=1' : '/cars'
  let from = defaultGarage
  if (fromRaw) {
    try {
      from = decodeURIComponent(fromRaw)
    } catch {
      from = '/cars'
    }
    if (!from.startsWith('/') || from.startsWith('//')) from = '/cars'
  }

  const allEvents = r.listEvents(id, scope)
  const events = allEvents.slice(0, 3)
  const docs = r.listDocs(id, scope).slice(0, 6)
  const recs = getCareRecommendations({ car, events: allEvents })
  const lastVisitAt = allEvents[0]?.at || null

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/cars">{mode === 'detailing' ? detailing?.name || 'Детейлинг' : 'Мой гараж'}</Link>
            <span> / </span>
            <span>Карточка авто</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <Link className="carBack" to={from} title="Назад в гараж">
              <span className="chev chev--left" aria-hidden="true" />
              <span className="srOnly">Назад</span>
            </Link>
            <h1 className="h1" style={{ margin: 0 }}>
              {car.make} {car.model}
            </h1>
          </div>
          <p className="muted carPage__meta">
            <span>{car.city || '—'}</span>
            <span aria-hidden="true"> • </span>
            <span className="mono" title="Госномер">
              {car.plate || '—'}
            </span>
            <span aria-hidden="true"> • </span>
            <span>
              VIN: <span className="mono">{car.vin || '—'}</span>
            </span>
            <span aria-hidden="true"> • </span>
            <span>{lastVisitAt ? fmtDate(lastVisitAt) : '—'}</span>
          </p>
        </div>
        <div className="row gap wrap">
          <Link className="btn" data-variant="ghost" to={`/car/${id}/edit`}>
            Редактировать
          </Link>
          <button
            className="btn"
            data-variant="danger"
            onClick={() => {
              const msg =
                'Удалить авто навсегда?\n\n' +
                'Если вы удалите ваше авто, оно больше не появится в сервисе (вместе с историей и фото).\n\n' +
                'Альтернатива: вместо удаления вы можете передать авто другому хозяину.'
              if (!confirm(msg)) return
              r.deleteCar(id)
              invalidateRepo()
              nav(getPathAfterCarRemovedFromScope(r, { mode, owner, detailingId }), { replace: true })
            }}
          >
            Удалить
          </button>
        </div>
      </div>

      <div
        className="carHero"
        style={car.hero ? { backgroundImage: `url("${String(car.hero).replaceAll('"', '%22')}")` } : undefined}
      >
        <div className="carHero__overlay">
          <div className="row gap wrap carHero__pills">
            <Pill>Цвет: {car.color || '—'}</Pill>
            <Pill>Год: {car.year != null && car.year !== '' ? car.year : '—'}</Pill>
            <Pill>Пробег: {fmtKm(car.mileageKm)}</Pill>
          </div>
        </div>
      </div>

      <div className="split">
        <Card className="card pad">
          <h2 className="h2">Данные</h2>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">VIN</span>
              <span className="kv__v mono">{car.vin || '—'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Госномер</span>
              <span className="kv__v mono">{car.plate || '—'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Год</span>
              <span className="kv__v">{car.year || '—'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Пробег</span>
              <span className="kv__v">{fmtKm(car.mileageKm)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Обновлено</span>
              <span className="kv__v">{fmtDateTime(car.updatedAt)}</span>
            </div>
          </div>

          <div className="topBorder">
            <div className="row spread gap">
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>
                  Фото последней мойки
                </div>
                <div className="muted small">
                  Обновляется автоматически после каждого визита с мойкой. Удалить фото можно в разделе «Редактировать» карточки.
                </div>
              </div>
            </div>

            {washPhotos.length ? (
              <div className="washGallery">
                <div className="washViewer">
                  <a
                    className="washGallery__viewer"
                    href={washPhotos[washIdx]}
                    target="_blank"
                    rel="noreferrer"
                    title="Открыть фото"
                  >
                    <img alt="Фото последней мойки" src={washPhotos[washIdx]} />
                  </a>
                </div>
                <div className="washGallery__controls">
                  <div className="row gap">
                    <button
                      className="btn"
                      data-variant="ghost"
                      onClick={() => setWashIdx((i) => (washPhotos.length ? (i - 1 + washPhotos.length) % washPhotos.length : 0))}
                      disabled={washPhotos.length <= 1}
                    >
                      ←
                    </button>
                    <button
                      className="btn"
                      data-variant="ghost"
                      onClick={() => setWashIdx((i) => (washPhotos.length ? (i + 1) % washPhotos.length : 0))}
                      disabled={washPhotos.length <= 1}
                    >
                      →
                    </button>
                  </div>
                  <div className="washGallery__dots" aria-label="Фото">
                    {washPhotos.slice(0, 12).map((_, idx) => (
                      <span key={idx} className={`washGallery__dot ${idx === washIdx ? 'is-active' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted small" style={{ marginTop: 10 }}>
                Пока нет фото. Они появятся после визита с мойкой.
              </div>
            )}
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">Рекомендации</h2>
              <Link className="btn" data-variant="primary" to={`/car/${id}/history?new=1`}>
                + Добавить визит
              </Link>
            </div>
            <div className="recList">
              {recs.map((x, idx) => (
                <div key={idx} className="recItem">
                  <div className="row gap wrap">
                    <span className="pill" data-tone={x.tone || 'neutral'}>
                      {x.tone === 'accent' ? 'важно' : 'совет'}
                    </span>
                    <span className="recTitle">{x.title}</span>
                  </div>
                  {x.why ? <div className="muted small recWhy">{x.why}</div> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">История</h2>
              <Link className="link" to={`/car/${id}/history`}>
                открыть →
              </Link>
            </div>
            {events.length ? (
              <div className="miniList">
                {events.map((e) => (
                  <div key={e.id} className="miniList__item">
                    <div className="miniList__title">{e.title || 'Событие'}</div>
                    <div className="miniList__meta">
                      {fmtDateTime(e.at)} • {fmtKm(e.mileageKm)}
                    </div>
                    {Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                      <div className="rowItem__sub">ТО: {e.maintenanceServices.join(', ')}</div>
                    ) : null}
                    {Array.isArray(e.services) && e.services.length ? (
                      <div className="rowItem__sub">Детейлинг: {e.services.join(', ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">Пока пусто.</div>
            )}
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">Документы / фото</h2>
              <Link className="link" to={`/car/${id}/docs`}>
                открыть →
              </Link>
            </div>
            {docs.length ? (
              <div className="thumbs">
                {docs.map((d) => (
                  <a key={d.id} className="thumb" href={d.url} target="_blank" rel="noreferrer">
                    <img alt={d.title} src={d.url} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="muted">Пока нет файлов.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

