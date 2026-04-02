import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, OpenAction, Pill } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'
import { splitWashDetailingServices, WASH_SERVICE_MARKERS } from '../../lib/serviceCatalogs.js'

export default function CarPage() {
  const { id } = useParams()
  const r = useRepo()
  const nav = useNavigate()
  const [washIdx, setWashIdx] = useState(0)
  const [recsOpen, setRecsOpen] = useState(false)
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

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/settings" replace />
  if (!car) return <Navigate to="/cars" replace />

  const allEvents = r.listEvents(id, scope)
  const lastWashEvent =
    allEvents.find((e) => Array.isArray(e?.services) && e.services.some((s) => WASH_SERVICE_MARKERS.has(s))) || null
  const docs = (r.listDocs(id, scope) || []).filter((d) => !d.eventId).slice(0, 6)
  const recs = getCareRecommendations({ car, events: allEvents })
  const lastServiceVisitAt = allEvents.find((e) => e.source === 'service')?.at || null

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/cars">{mode === 'detailing' ? detailing?.name || 'Детейлинг' : 'Мой гараж'}</Link>
            <span> / </span>
            <span>Карточка авто</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              {car.make} {car.model}
            </h1>
          </div>
          <p className="muted carPage__meta">
            <span>{car.city || '—'}</span>
            <span aria-hidden="true"> · </span>
            <span className="mono" title="Госномер">
              {fmtPlateFull(car.plate, car.plateRegion) || '—'}
            </span>
            <span aria-hidden="true"> · </span>
            <span>
              VIN: <span className="mono">{car.vin || '—'}</span>
            </span>
            {lastServiceVisitAt ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{fmtDate(lastServiceVisitAt)}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div
        className="carHero"
        style={car.hero ? { backgroundImage: `url("${String(car.hero).replaceAll('"', '%22')}")` } : undefined}
      >
        <div className="carHero__overlay">
          <div className="heroActions" aria-label="Действия">
            <Link
              className="btn carPage__iconBtn"
              data-variant="ghost"
              to={`/car/${id}/edit`}
              aria-label="Редактировать"
              title="Редактировать"
            >
              <span className="carPage__icon carPage__icon--edit" aria-hidden="true" />
              <span className="carPage__btnText">Редактировать</span>
            </Link>
            <button
              className="btn carPage__iconBtn"
              data-variant="danger"
              aria-label="Удалить"
              title="Удалить"
              onClick={() => {
                const msg =
                  'Удалить авто навсегда?\n\n' +
                  'Если вы удалите ваше авто, оно больше не появится в сервисе (вместе с историей и фото).\n\n' +
                  'Альтернатива: вместо удаления вы можете передать авто другому хозяину.'
                if (!confirm(msg)) return
                const ok = r.deleteCar(id, scope)
                if (!ok) {
                  alert('Не удалось удалить авто (нет доступа).')
                  return
                }
                invalidateRepo()
                nav(getPathAfterCarRemovedFromScope(r, { mode, owner, detailingId }), { replace: true })
              }}
            >
              <span className="carPage__icon carPage__icon--trash" aria-hidden="true" />
              <span className="carPage__btnText">Удалить</span>
            </button>
          </div>
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
              <span className="kv__v mono">{fmtPlateFull(car.plate, car.plateRegion) || '—'}</span>
            </div>
            {mode === 'detailing' && (car.clientName || car.clientPhone || car.clientEmail) ? (
              <>
                <div className="kv__row">
                  <span className="kv__k">Клиент</span>
                  <span className="kv__v">{car.clientName || '—'}</span>
                </div>
                <div className="kv__row">
                  <span className="kv__k">Телефон</span>
                  <span className="kv__v mono">{car.clientPhone || '—'}</span>
                </div>
                <div className="kv__row">
                  <span className="kv__k">Почта</span>
                  <span className="kv__v mono">{car.clientEmail || '—'}</span>
                </div>
              </>
            ) : null}
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
                  Фото после ухода
                </div>
                <div className="muted small">
                  Обновляется автоматически после визита с услугами ухода за кузовом. Удалить фото можно в разделе «Редактировать» карточки.
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
                    <img alt="Фото после ухода" src={washPhotos[washIdx]} />
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
                Пока нет фото. Они появятся после визита с услугами ухода.
              </div>
            )}
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad">
            <div className="row spread gap">
              <button
                type="button"
                className="carPage__recsToggle"
                aria-expanded={recsOpen ? 'true' : 'false'}
                onClick={() => setRecsOpen((v) => !v)}
                title={recsOpen ? 'Свернуть рекомендации' : 'Показать рекомендации'}
              >
                <span className={`carPage__chev ${recsOpen ? 'is-open' : ''}`} aria-hidden="true" />
                <span className="h2" style={{ margin: 0 }}>
                  Рекомендации
                </span>
              </button>
              <Link className="btn" data-variant="primary" to={`/car/${id}/history?new=1`}>
                + Добавить визит
              </Link>
            </div>
            {recsOpen ? (
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
            ) : null}
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">Последний уход</h2>
              <OpenAction to={`/car/${id}/history`} />
            </div>
            {lastWashEvent ? (
              <div className="miniList">
                <div className="miniList__item">
                  <div className="miniList__title metaStrong">{lastWashEvent.title || 'Уход'}</div>
                  <div className="miniList__meta">
                    <span className="eventMeta__when">{fmtDateTime(lastWashEvent.at)}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="eventMeta__km">{fmtKm(lastWashEvent.mileageKm)}</span>
                  </div>
                  {Array.isArray(lastWashEvent.maintenanceServices) && lastWashEvent.maintenanceServices.length ? (
                    <div className="rowItem__sub">
                      <span className="eventLabel">ТО:</span> {lastWashEvent.maintenanceServices.join(', ')}
                    </div>
                  ) : null}
                  {(() => {
                    const { wash, other } = splitWashDetailingServices(lastWashEvent.services)
                    return (
                      <>
                        {wash.length ? (
                          <div className="rowItem__sub">
                            <span className="eventLabel">Уход:</span> {wash.join(', ')}
                          </div>
                        ) : null}
                        {other.length ? (
                          <div className="rowItem__sub">
                            <span className="eventLabel">Детейлинг:</span> {other.join(', ')}
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <div className="muted">Пока нет записей об уходе.</div>
            )}
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">Документы / фото</h2>
              <OpenAction to={`/car/${id}/docs`} />
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

