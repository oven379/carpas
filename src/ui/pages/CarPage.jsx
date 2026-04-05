import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, DropdownCaretIcon, OpenAction, Pill } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { getSessionOwner, hasOwnerSession } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'
import { WASH_SERVICE_MARKERS, splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { buildCarSubRoutePath, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import { detailingCarAccessBadge, ownerServiceLinkSummary } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'

function prevWashFromEvents(lastEvt, evts) {
  if (!lastEvt) return { prevWashEvt: null, prevWashList: [] }
  const { wash } = splitWashDetailingServices(lastEvt.services)
  if (wash.length) return { prevWashEvt: null, prevWashList: [] }
  const list = Array.isArray(evts) ? evts : []
  const prevWashEvt =
    list.find((e) => Array.isArray(e?.services) && e.services.some((s) => WASH_SERVICE_MARKERS.has(s))) || null
  return {
    prevWashEvt,
    prevWashList: prevWashEvt ? splitWashDetailingServices(prevWashEvt.services).wash : [],
  }
}

function CarPageOwnerLastVisitPreview({ lastEvt, allEvents, photoUrl, histPath }) {
  if (!lastEvt) return null
  const headline =
    lastEvt.source === 'owner'
      ? String(lastEvt.title || '').trim() || 'Визит'
      : String(lastEvt.detailingName || '').trim() || String(lastEvt.title || '').trim() || 'Сервис'
  const ms = Array.isArray(lastEvt.maintenanceServices) ? lastEvt.maintenanceServices : []
  const { wash, other: det } = splitWashDetailingServices(lastEvt.services)
  const note = String(lastEvt.note || '').trim()
  const { prevWashEvt, prevWashList } = prevWashFromEvents(lastEvt, allEvents)
  return (
    <Link className="carPage__ownerLastVisitHit" to={histPath} aria-label={`Открыть визит: ${headline}`}>
      <div className="rowItem__meta carPage__meta carPage__ownerLastVisitMeta">
        <span className="metaStrong">Последний визит</span>
        {lastEvt.at ? (
          <>
            <span aria-hidden="true"> · </span>
            <span className="eventMeta__when">{fmtDateTime(lastEvt.at)}</span>
          </>
        ) : null}
        {lastEvt.mileageKm != null && lastEvt.mileageKm !== '' ? (
          <>
            <span aria-hidden="true"> · </span>
            <span className="eventMeta__km">{fmtKm(lastEvt.mileageKm)}</span>
          </>
        ) : null}
      </div>
      <div className="rowItem__lastEvt">
        <div className="rowItem__lastEvtTop">
          {photoUrl ? (
            <span
              className="rowItem__lastEvtPhoto"
              aria-hidden="true"
              style={{ backgroundImage: `url("${String(photoUrl).replaceAll('"', '%22')}")` }}
            />
          ) : null}
          <div className="rowItem__lastEvtText">
            <div className="rowItem__lastEvtName">{headline}</div>
          </div>
        </div>
        <div className="rowItem__lastEvtMeta">
          {ms.length ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">ТО:</span> {ms.join(', ')}
            </div>
          ) : null}
          {wash.length ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Уход:</span> {wash.join(', ')}
            </div>
          ) : null}
          {det.length ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Детейлинг:</span> {det.join(', ')}
            </div>
          ) : null}
          {!ms.length && !wash.length && !det.length && note ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Комментарий:</span> {note}
            </div>
          ) : null}
          {prevWashList.length ? (
            <div className="rowItem__lastEvtLine rowItem__lastEvtLine--prevWash">
              <span className="eventLabel">Уход</span>
              {prevWashEvt?.at ? (
                <span className="rowItem__lastEvtWashWhen">{` (${fmtDateTime(prevWashEvt.at)})`}</span>
              ) : null}
              <span>: </span>
              {prevWashList.join(', ')}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default function CarPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const r = useRepo()
  const nav = useNavigate()
  const [washIdx, setWashIdx] = useState(0)
  const [recsOpen, setRecsOpen] = useState(false)
  const [ownerDataExpanded, setOwnerDataExpanded] = useState(true)
  const [photoLb, setPhotoLb] = useState(null)
  const { detailingId, detailing, owner, mode } = useDetailing()
  const ownerEmailResolved = String(owner?.email || getSessionOwner()?.email || '').trim()
  const [car, setCar] = useState(null)
  const [docs, setDocs] = useState([])
  const [allCarDocs, setAllCarDocs] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])
  const [inboxClaims, setInboxClaims] = useState([])
  const [dataReady, setDataReady] = useState(false)
  const prevCarIdRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      const idChanged = prevCarIdRef.current !== id
      prevCarIdRef.current = id
      if (idChanged) setDataReady(false)
      try {
        const claimsP =
          hasOwnerSession() && ownerEmailResolved
            ? r.listClaimsForOwner()
            : mode === 'detailing' && detailingId
              ? r.listClaimsForDetailing()
              : Promise.resolve([])
        const [[cr, d, ev], claimsRaw] = await Promise.all([
          Promise.all([r.getCar(id), r.listDocs(id), r.listEvents(id)]),
          claimsP,
        ])
        if (cancelled) return
        setCar(cr)
        const dRaw = Array.isArray(d) ? d : []
        setAllCarDocs(dRaw)
        setDocs(dRaw.filter((x) => !x.eventId).slice(0, 6))
        setAllEvents(Array.isArray(ev) ? ev : [])
        if (hasOwnerSession() && ownerEmailResolved) {
          setOwnerClaims(Array.isArray(claimsRaw) ? claimsRaw : [])
          setInboxClaims([])
        } else if (mode === 'detailing' && detailingId) {
          setOwnerClaims([])
          setInboxClaims(Array.isArray(claimsRaw) ? claimsRaw : [])
        } else {
          setOwnerClaims([])
          setInboxClaims([])
        }
      } catch {
        if (!cancelled) {
          setCar(null)
          setDocs([])
          setAllCarDocs([])
          setAllEvents([])
          setOwnerClaims([])
          setInboxClaims([])
        }
      } finally {
        if (!cancelled) setDataReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, r, r._version, mode, ownerEmailResolved, detailingId])

  const docGalleryItems = useMemo(() => docsToPhotoItems(docs), [docs])

  const ownerServiceSummary = useMemo(() => {
    if (mode !== 'owner' || !ownerEmailResolved || !car) return null
    return ownerServiceLinkSummary(car, ownerEmailResolved, ownerClaims)
  }, [mode, ownerEmailResolved, car, ownerClaims])

  const detailingAccess = useMemo(() => {
    if (mode !== 'detailing' || !car) return null
    return detailingCarAccessBadge(car, detailingId, inboxClaims)
  }, [mode, car, detailingId, inboxClaims])

  const washPhotos = useMemo(() => {
    if (!car) return []
    return Array.isArray(car.washPhotos) ? car.washPhotos : car.washPhoto ? [car.washPhoto] : []
  }, [car])

  const washPhotosKey = useMemo(() => washPhotos.join('|'), [washPhotos])

  useEffect(() => {
    setWashIdx(0)
  }, [washPhotosKey])

  useEffect(() => {
    setOwnerDataExpanded(true)
  }, [id])

  const finalizedEvents = useMemo(() => allEvents.filter((e) => !e?.isDraft), [allEvents])
  const lastHistoryEvent = useMemo(() => {
    let best = null
    let bestTs = 0
    for (const e of finalizedEvents) {
      const t = Date.parse(e?.at || '') || 0
      if (t >= bestTs) {
        bestTs = t
        best = e
      }
    }
    return best
  }, [finalizedEvents])

  const lastVisitDocs = useMemo(() => {
    if (!lastHistoryEvent?.id) return []
    const id = String(lastHistoryEvent.id)
    return (Array.isArray(allCarDocs) ? allCarDocs : []).filter(
      (d) => d && String(d.eventId || '') === id && String(d.url || '').trim(),
    )
  }, [allCarDocs, lastHistoryEvent?.id])

  const displayMileageKm = useMemo(() => {
    if (!car) return 0
    if (mode !== 'owner') return Number(car.mileageKm) || 0
    if (
      lastHistoryEvent != null &&
      lastHistoryEvent.mileageKm != null &&
      lastHistoryEvent.mileageKm !== ''
    ) {
      return lastHistoryEvent.mileageKm
    }
    return Number(car.mileageKm) || 0
  }, [car, mode, lastHistoryEvent])

  const lastVisitGalleryItems = useMemo(() => docsToPhotoItems(lastVisitDocs), [lastVisitDocs])

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
  if (!dataReady) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!car) {
    return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />
  }

  const fromParam = sp.get('from') || ''
  const listReturn = resolveCarListReturnPath(mode, fromParam)
  const backTitle =
    mode === 'detailing'
      ? 'К кабинету'
      : listReturn === '/garage' || listReturn.startsWith('/garage?')
        ? 'В гараж'
        : 'К автомобилям'

  const recs = getCareRecommendations({ car, events: allEvents })
  const lastServiceVisitAt = (() => {
    let best = ''
    let bestTs = 0
    for (const e of allEvents) {
      if (e?.source !== 'service') continue
      const t = Date.parse(e.at || '') || 0
      if (t >= bestTs) {
        bestTs = t
        best = e.at || ''
      }
    }
    return best || null
  })()
  const ownerCarLockedByDetailing = mode === 'owner' && Boolean(car.detailingId)
  const ownerLastVisitPath = lastHistoryEvent
    ? buildCarSubRoutePath(id, 'history', fromParam, { visit: String(lastHistoryEvent.id) })
    : ''

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to={listReturn}>
              {mode === 'detailing' ? detailing?.name || 'Кабинет' : ownerGarageListCrumbLabel(listReturn)}
            </Link>
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
          {!ownerCarLockedByDetailing ? (
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
                onClick={async () => {
                  const msg =
                    'Удалить авто навсегда?\n\n' +
                    'Если вы удалите ваше авто, оно больше не появится в сервисе (вместе с историей и фото).\n\n' +
                    'Альтернатива: вместо удаления вы можете передать авто другому хозяину.'
                  if (!confirm(msg)) return
                  try {
                    await r.deleteCar(id)
                    invalidateRepo()
                    const list = await r.listCars()
                    nav(getPathAfterCarRemovedFromScope(list, { mode, owner, detailingId }), { replace: true })
                  } catch {
                    alert('Не удалось удалить авто (нет доступа).')
                  }
                }}
              >
                <span className="carPage__icon carPage__icon--trash" aria-hidden="true" />
                <span className="carPage__btnText">Удалить</span>
              </button>
            </div>
          ) : null}
          <div className="row gap wrap carHero__pills">
            <Pill>Цвет: {car.color || '—'}</Pill>
            <Pill>Год: {car.year != null && car.year !== '' ? car.year : '—'}</Pill>
            <Pill>Пробег: {fmtKm(displayMileageKm)}</Pill>
          </div>
        </div>
      </div>

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
              Личный кабинет владельца не подключён — карточка ведётся только у вас. Клиент может подать заявку с улицы,
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
          {mode === 'owner' && ownerServiceSummary ? (
            <>
              <div className="row spread gap carPage__ownerDataBar" style={{ alignItems: 'center' }}>
                <div className="cardTitle" style={{ margin: 0 }}>
                  Сервис и доступ
                </div>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--suffix"
                  aria-expanded={ownerDataExpanded ? 'true' : 'false'}
                  onClick={() => setOwnerDataExpanded((v) => !v)}
                  title={ownerDataExpanded ? 'Свернуть' : 'Развернуть'}
                  aria-label={ownerDataExpanded ? 'Свернуть блок сервиса и данных' : 'Развернуть блок сервиса и данных'}
                >
                  <DropdownCaretIcon open={ownerDataExpanded} />
                </button>
              </div>

              {ownerDataExpanded ? (
                <div className="carPage__ownerServiceExpand">
                  {ownerServiceSummary.kind === 'no_service' ? (
                    <div className="carPage__ownerServiceSection">
                      {lastHistoryEvent && ownerLastVisitPath ? (
                        <CarPageOwnerLastVisitPreview
                          lastEvt={lastHistoryEvent}
                          allEvents={allEvents}
                          photoUrl={lastVisitDocs[0]?.url || ''}
                          histPath={ownerLastVisitPath}
                        />
                      ) : (
                        <p className="muted small" style={{ margin: 0 }}>
                          Пока нет сохранённых визитов. Добавьте запись в разделе «История авто».
                        </p>
                      )}
                      <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
                        Привязка к партнёру на улице добавит записи «от сервиса» в историю.
                      </p>
                      <div className="row gap wrap" style={{ marginTop: 10 }}>
                        <Link className="btn" data-variant="primary" to="/market">
                          Открыть улицу
                        </Link>
                      </div>
                    </div>
                  ) : ownerServiceSummary.ownerLink === 'approved' || ownerServiceSummary.ownerLink === 'implicit' ? (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div
                        className="carPage__historyServiceAvatar"
                        title={ownerServiceSummary.serviceName}
                        aria-label={`Сервис: ${ownerServiceSummary.serviceName}`}
                      >
                        {lastHistoryEvent?.source === 'service' && lastHistoryEvent.detailingLogo ? (
                          <img alt="" src={lastHistoryEvent.detailingLogo} />
                        ) : (
                          <span className="carPage__historyServiceAvatarFallback" aria-hidden="true">
                            {ownerServiceSummary.serviceName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 'min(100%, 240px)' }}>
                        <div className="metaStrong">Обслуживается в: {ownerServiceSummary.serviceName}</div>
                        <div className="row gap wrap" style={{ marginTop: 6, alignItems: 'center' }}>
                          <Pill tone="accent">Связь с сервисом подтверждена</Pill>
                        </div>
                        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                          История с пометкой «Подтверждено детейлингом» добавлена сервисом; свои записи вы добавляете сами.
                        </p>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <div style={{ marginTop: 12 }}>
                            <CarPageOwnerLastVisitPreview
                              lastEvt={lastHistoryEvent}
                              allEvents={allEvents}
                              photoUrl={lastVisitDocs[0]?.url || ''}
                              histPath={ownerLastVisitPath}
                            />
                          </div>
                        ) : (
                          <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
                            Пока нет сохранённых визитов.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : ownerServiceSummary.ownerLink === 'pending' ? (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div className="carPage__historyServiceAvatar" aria-hidden="true">
                        <span className="carPage__historyServiceAvatarFallback">
                          {ownerServiceSummary.serviceName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 'min(100%, 240px)' }}>
                        <div className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</div>
                        <div className="row gap wrap" style={{ marginTop: 6, alignItems: 'center' }}>
                          <Pill tone="neutral">Заявка на рассмотрении</Pill>
                        </div>
                        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                          Детейлинг проверит заявку. После одобрения авто появится в вашем гараже со всей историей сервиса.
                        </p>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <div style={{ marginTop: 12 }}>
                            <CarPageOwnerLastVisitPreview
                              lastEvt={lastHistoryEvent}
                              allEvents={allEvents}
                              photoUrl={lastVisitDocs[0]?.url || ''}
                              histPath={ownerLastVisitPath}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div className="carPage__historyServiceAvatar" aria-hidden="true">
                        <span className="carPage__historyServiceAvatarFallback">
                          {ownerServiceSummary.serviceName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 'min(100%, 240px)' }}>
                        <div className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</div>
                        <div className="row gap wrap" style={{ marginTop: 6, alignItems: 'center' }}>
                          <Pill tone="neutral">Заявка отклонена</Pill>
                        </div>
                        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                          Уточните данные и попробуйте снова через улицу или свяжитесь с сервисом напрямую.
                        </p>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <div style={{ marginTop: 12 }}>
                            <CarPageOwnerLastVisitPreview
                              lastEvt={lastHistoryEvent}
                              allEvents={allEvents}
                              photoUrl={lastVisitDocs[0]?.url || ''}
                              histPath={ownerLastVisitPath}
                            />
                          </div>
                        ) : null}
                        <div className="row gap wrap" style={{ marginTop: 10 }}>
                          <Link className="btn" data-variant="primary" to="/market">
                            Улица
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {!ownerDataExpanded ? (
                <div className="carPage__ownerDataCollapsed">
                  <h2 className="h2 carPage__dataTitle">Данные авто</h2>
                  {lastVisitDocs.length ? (
                    <div className="thumbs">
                      {lastVisitDocs.map((d) => {
                        const gi = lastVisitGalleryItems.findIndex((g) => g.id === d.id)
                        return gi >= 0 ? (
                          <button
                            key={d.id}
                            type="button"
                            className="thumb thumb--lb"
                            aria-label={d.title ? `Открыть фото: ${d.title}` : 'Открыть фото'}
                            onClick={() =>
                              setPhotoLb({
                                items: lastVisitGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                                startIndex: gi,
                              })
                            }
                          >
                            <img alt={d.title || ''} src={d.url} />
                          </button>
                        ) : (
                          <a key={d.id} className="thumb" href={d.url} target="_blank" rel="noreferrer">
                            <img alt={d.title || ''} src={d.url} />
                          </a>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="muted small" style={{ margin: 0 }}>
                      Нет фото, прикреплённых к последнему визиту.
                    </p>
                  )}
                </div>
              ) : null}

              {ownerDataExpanded ? (
                <>
                  <h2 className="h2 carPage__dataTitle carPage__dataTitle--afterService">Данные авто</h2>
                  <div className="kv">
                    <div className="kv__row">
                      <span className="kv__k">VIN</span>
                      <span className="kv__v mono">{car.vin || '—'}</span>
                    </div>
                    <div className="kv__row">
                      <span className="kv__k">Госномер</span>
                      <span className="kv__v mono">{fmtPlateFull(car.plate, car.plateRegion) || '—'}</span>
                    </div>
                    <div className="kv__row">
                      <span className="kv__k">Год</span>
                      <span className="kv__v">{car.year || '—'}</span>
                    </div>
                    <div className="kv__row">
                      <span className="kv__k">Пробег</span>
                      <span className="kv__v">{fmtKm(displayMileageKm)}</span>
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
                              onClick={() =>
                                setWashIdx((i) => (washPhotos.length ? (i - 1 + washPhotos.length) % washPhotos.length : 0))
                              }
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
                </>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="h2 carPage__dataTitle">Данные авто</h2>
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
                  <span className="kv__v">{fmtKm(displayMileageKm)}</span>
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
                          onClick={() =>
                            setWashIdx((i) => (washPhotos.length ? (i - 1 + washPhotos.length) % washPhotos.length : 0))
                          }
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
            </>
          )}
        </Card>

        <div className="col gap">
          <Card className="card pad">
            <div className="carPage__recsBar">
              <button
                type="button"
                className="carPage__recsSelect"
                aria-expanded={recsOpen ? 'true' : 'false'}
                aria-haspopup="true"
                onClick={() => setRecsOpen((v) => !v)}
                title={recsOpen ? 'Свернуть список рекомендаций' : 'Открыть список рекомендаций'}
              >
                <span className="carPage__recsSelectLabel">Рекомендации</span>
                <span className="carPage__recsSelectChev" aria-hidden="true" />
              </button>
              <Link
                className="btn carPage__recsAddVisitBtn"
                data-variant="outline"
                to={buildCarSubRoutePath(id, 'history', fromParam, { new: '1' })}
                aria-label="Добавить визит"
                title="Добавить визит"
              >
                <span className="carPage__recsAddVisitText">+ Добавить визит</span>
                <span className="carPage__recsPlusIcon" aria-hidden="true">
                  +
                </span>
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
            <div className="row spread gap carPage__sectionRow">
              <div className="carPage__sectionHead">
                <h2 className="h2 carPage__sectionTitle">История авто</h2>
                {lastHistoryEvent?.at ? (
                  <>
                    <p className="carPage__historyLastLabel muted small">Последний визит</p>
                    <p className="carPage__historyLastLine">
                      <span className="metaStrong">{lastHistoryEvent.title?.trim() || 'Визит'}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="metaStrong">{fmtDateTime(lastHistoryEvent.at)}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="metaStrong">{fmtKm(lastHistoryEvent.mileageKm)}</span>
                    </p>
                    <div className="carPage__historySource row gap" style={{ alignItems: 'center', marginTop: 10 }}>
                      {lastHistoryEvent.source === 'owner' ? (
                        <span className="muted small carPage__historyOwnerNote">
                          {mode === 'owner' ? 'Моя запись' : 'Запись владельца'}
                        </span>
                      ) : (
                        (() => {
                          const serviceLabel =
                            String(lastHistoryEvent.detailingName || '').trim() || 'Сервис'
                          const initials = serviceLabel.slice(0, 2).toUpperCase()
                          return (
                            <div
                              className="carPage__historyServiceAvatar"
                              title={serviceLabel}
                              aria-label={`Запись сервиса: ${serviceLabel}`}
                            >
                              {lastHistoryEvent.detailingLogo ? (
                                <img alt="" src={lastHistoryEvent.detailingLogo} />
                              ) : (
                                <span className="carPage__historyServiceAvatarFallback" aria-hidden="true">
                                  {initials}
                                </span>
                              )}
                            </div>
                          )
                        })()
                      )}
                    </div>
                    {(() => {
                      const e = lastHistoryEvent
                      const { wash, other } = splitWashDetailingServices(e.services)
                      const hasExtra =
                        (Array.isArray(e.maintenanceServices) && e.maintenanceServices.length > 0) ||
                        wash.length > 0 ||
                        other.length > 0
                      if (!hasExtra) return null
                      return (
                        <div className="carPage__historyLastDetails miniList" style={{ marginTop: 12 }}>
                          <div className="miniList__item" style={{ border: 'none', padding: 0, background: 'transparent' }}>
                            {Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                              <div className="rowItem__sub">
                                <span className="eventLabel">ТО:</span> {e.maintenanceServices.join(', ')}
                              </div>
                            ) : null}
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
                          </div>
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <p className="muted small carPage__sectionMeta">Нет истории</p>
                )}
              </div>
              <OpenAction
                to={buildCarSubRoutePath(id, 'history', fromParam)}
                title="История авто"
                aria-label="Открыть историю авто"
              />
            </div>
          </Card>

          <Card className="card pad">
            <div className="row spread gap carPage__sectionRow carPage__sectionRow--center">
              <h2 className="h2 carPage__sectionTitle carPage__sectionTitle--solo">Документы / фото</h2>
              <OpenAction
                to={buildCarSubRoutePath(id, 'docs', fromParam)}
                title="Документы и фото"
                aria-label="Документы и фото"
              />
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

