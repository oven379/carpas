import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, OpenAction, Pill } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'
import { splitWashDetailingServices, WASH_SERVICE_MARKERS } from '../../lib/serviceCatalogs.js'
import { buildCarSubRoutePath, resolveCarListReturnPath } from '../carNav.js'
import { detailingCarAccessBadge, ownerServiceLinkSummary } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'

export default function CarPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const r = useRepo()
  const nav = useNavigate()
  const [washIdx, setWashIdx] = useState(0)
  const [recsOpen, setRecsOpen] = useState(false)
  const [photoLb, setPhotoLb] = useState(null)
  const { detailingId, detailing, owner, mode } = useDetailing()
  const scope = useMemo(
    () => (mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }),
    [mode, owner?.email, detailingId],
  )
  const car = r.getCar(id, scope)

  const docs = useMemo(() => {
    if (!id) return []
    return (r.listDocs(id, scope) || []).filter((d) => !d.eventId).slice(0, 6)
  }, [id, r, scope])
  const docGalleryItems = useMemo(() => docsToPhotoItems(docs), [docs])

  const ownerServiceSummary = useMemo(() => {
    if (mode !== 'owner' || !owner?.email || !car) return null
    return ownerServiceLinkSummary(r, car, owner.email)
  }, [mode, owner?.email, car, r])

  const detailingAccess = useMemo(() => {
    if (mode !== 'detailing' || !car) return null
    return detailingCarAccessBadge(r, car, detailingId)
  }, [mode, car, r, detailingId])

  const washPhotos = useMemo(() => {
    if (!car) return []
    return Array.isArray(car.washPhotos) ? car.washPhotos : car.washPhoto ? [car.washPhoto] : []
  }, [car])

  const washPhotosKey = useMemo(() => washPhotos.join('|'), [washPhotos])

  useEffect(() => {
    setWashIdx(0)
  }, [washPhotosKey])

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
  if (!car) {
    return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />
  }

  const fromParam = sp.get('from') || ''
  const listReturn = resolveCarListReturnPath(mode, fromParam)
  const backTitle = mode === 'detailing' ? 'К кабинету' : 'В гараж'

  const allEvents = r.listEvents(id, scope)
  const lastWashEvent =
    allEvents.find((e) => Array.isArray(e?.services) && e.services.some((s) => WASH_SERVICE_MARKERS.has(s))) || null
  const recs = getCareRecommendations({ car, events: allEvents })
  const lastServiceVisitAt = allEvents.find((e) => e.source === 'service')?.at || null

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to={listReturn}>{mode === 'detailing' ? detailing?.name || 'Кабинет' : 'Мой гараж'}</Link>
            <span> / </span>
            <span>Карточка авто</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav to={listReturn} title={backTitle} />
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
              to={buildCarSubRoutePath(id, 'edit', fromParam)}
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

      {mode === 'owner' && ownerServiceSummary ? (
        <Card className="card pad" style={{ marginBottom: 16 }}>
          <div className="cardTitle" style={{ marginBottom: 8 }}>
            Сервис и доступ
          </div>
          {ownerServiceSummary.kind === 'no_service' ? (
            <>
              <p className="muted small" style={{ margin: 0 }}>
                Карточка только в вашем гараже: обслуживание у партнёра ещё не привязано. Записи «от сервиса» появятся после
                привязки через витрину или когда детейлинг заведёт авто на ваш аккаунт.
              </p>
              <div className="row gap wrap" style={{ marginTop: 10 }}>
                <Link className="btn" data-variant="primary" to="/market">
                  Открыть витрину
                </Link>
              </div>
            </>
          ) : ownerServiceSummary.ownerLink === 'approved' || ownerServiceSummary.ownerLink === 'implicit' ? (
            <>
              <div className="row gap wrap" style={{ alignItems: 'center' }}>
                <span className="metaStrong">Обслуживается в: {ownerServiceSummary.serviceName}</span>
                <Pill tone="accent">Связь с сервисом подтверждена</Pill>
              </div>
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                История с пометкой «Подтверждено детейлингом» добавлена сервисом; свои записи вы добавляете сами.
              </p>
            </>
          ) : ownerServiceSummary.ownerLink === 'pending' ? (
            <>
              <div className="row gap wrap" style={{ alignItems: 'center' }}>
                <span className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</span>
                <Pill tone="neutral">Заявка на рассмотрении</Pill>
              </div>
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                Детейлинг проверит заявку. После одобрения авто появится в вашем гараже со всей историей сервиса.
              </p>
            </>
          ) : (
            <>
              <div className="row gap wrap" style={{ alignItems: 'center' }}>
                <span className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</span>
                <Pill tone="neutral">Заявка отклонена</Pill>
              </div>
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                Уточните данные и попробуйте снова через витрину или свяжитесь с сервисом напрямую.
              </p>
              <div className="row gap wrap" style={{ marginTop: 10 }}>
                <Link className="btn" data-variant="primary" to="/market">
                  Витрина
                </Link>
              </div>
            </>
          )}
        </Card>
      ) : null}

      {mode === 'detailing' && detailingAccess?.label ? (
        <Card className="card pad" style={{ marginBottom: 16 }}>
          <div className="cardTitle" style={{ marginBottom: 8 }}>
            Клиент и доступ
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <Pill tone={detailingAccess.tone}>{detailingAccess.label}</Pill>
          </div>
          {detailingAccess.label === 'Учёт в сервисе' ? (
            <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
              Личный кабинет владельца не подключён — карточка ведётся только у вас. Клиент может подать заявку с витрины,
              чтобы привязать аккаунт.
            </p>
          ) : null}
          {detailingAccess.label === 'Заявка владельца' ? (
            <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
              Владелец запросил привязку аккаунта к этой машине. Примите или отклоните заявку в разделе «Заявки».
            </p>
          ) : null}
          {detailingAccess.label === 'Владелец в приложении' ? (
            <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
              В гараже клиента: <span className="mono">{car.ownerEmail}</span>
            </p>
          ) : null}
          {detailingAccess.label === 'Заявка владельца' ? (
            <div className="row gap wrap" style={{ marginTop: 10 }}>
              <Link className="btn" data-variant="primary" to="/requests">
                Перейти к заявкам
              </Link>
            </div>
          ) : null}
        </Card>
      ) : null}

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
              <Link className="btn" data-variant="primary" to={buildCarSubRoutePath(id, 'history', fromParam, { new: '1' })}>
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
              <OpenAction to={buildCarSubRoutePath(id, 'history', fromParam)} />
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
              <OpenAction to={buildCarSubRoutePath(id, 'docs', fromParam)} />
            </div>
            {docs.length ? (
              <div className="thumbs">
                {docs.map((d) => {
                  const gi = docGalleryItems.findIndex((g) => g.id === d.id)
                  return gi >= 0 ? (
                    <button
                      key={d.id}
                      type="button"
                      className="thumb thumb--lb"
                      aria-label={d.title ? `Открыть фото: ${d.title}` : 'Открыть фото'}
                      onClick={() =>
                        setPhotoLb({
                          items: docGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                          startIndex: gi,
                        })
                      }
                    >
                      <img alt={d.title} src={d.url} />
                    </button>
                  ) : (
                    <a key={d.id} className="thumb" href={d.url} target="_blank" rel="noreferrer">
                      <img alt={d.title} src={d.url} />
                    </a>
                  )
                })}
              </div>
            ) : (
              <div className="muted">Пока нет файлов.</div>
            )}
          </Card>
        </div>
      </div>
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}

