import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { BackNav, Card, DropdownCaretIcon, OpenAction, PageLoadSpinner, Pill } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { normalizeCarEventServices, splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { buildCarSubRoutePath, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import {
  DETAILING_ACCESS_SERVICE_ONLY_LABEL,
  detailingCarAccessBadge,
  ownerServiceLinkSummary,
} from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { carDocFileBadgeLabel, carDocHasImageThumbnail } from '../../lib/carDocDisplay.js'

function CarPageOwnerLastVisitPreview({ lastEvt, photoUrl, histPath }) {
  const [thumbBroken, setThumbBroken] = useState(false)
  const resolvedThumb = useMemo(() => (String(photoUrl || '').trim() ? resolvePublicMediaUrl(photoUrl) : ''), [photoUrl])
  useEffect(() => {
    setThumbBroken(false)
  }, [resolvedThumb])

  if (!lastEvt) return null
  const titleTrim = String(lastEvt.title || '').trim()
  const headline =
    lastEvt.source === 'owner'
      ? titleTrim || 'Визит'
      : titleTrim || String(lastEvt.detailingName || '').trim() || 'Сервис'
  const ms = (Array.isArray(lastEvt.maintenanceServices) ? lastEvt.maintenanceServices : []).filter(Boolean)
  const { wash, other: det } = splitWashDetailingServices(lastEvt.services)
  const washF = wash.filter(Boolean)
  const detF = det.filter(Boolean)
  const note = String(lastEvt.note || '').trim()
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
          {resolvedThumb && !thumbBroken ? (
            <img
              className="rowItem__lastEvtPhoto rowItem__lastEvtPhoto--img"
              alt=""
              src={resolvedThumb}
              decoding="async"
              onError={() => setThumbBroken(true)}
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
          {washF.length ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Уход:</span> {washF.join(', ')}
            </div>
          ) : null}
          {detF.length ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Детейлинг:</span> {detF.join(', ')}
            </div>
          ) : null}
          {note ? (
            <div className="rowItem__lastEvtLine">
              <span className="eventLabel">Комментарий:</span> {note}
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
  const [washIdx, setWashIdx] = useState(0)
  const [recsOpen, setRecsOpen] = useState(false)
  const [ownerDataExpanded, setOwnerDataExpanded] = useState(true)
  const [carDataExpanded, setCarDataExpanded] = useState(true)
  const [photoLb, setPhotoLb] = useState(null)
  const { detailingId, detailing, owner, mode, loading } = useDetailing()
  const ownerEmailResolved = String(owner?.email || '').trim()
  const [car, setCar] = useState(null)
  const [docs, setDocs] = useState([])
  const [allCarDocs, setAllCarDocs] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])
  const [inboxClaims, setInboxClaims] = useState([])
  const [dataReady, setDataReady] = useState(false)
  const [vinCopyFlash, setVinCopyFlash] = useState(false)
  const prevCarIdRef = useRef(null)
  const vinCopyTimerRef = useRef(null)

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
        setAllEvents(Array.isArray(ev) ? ev.map(normalizeCarEventServices) : [])
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

  const docGalleryItems = useMemo(
    () => docsToPhotoItems(docs.filter((d) => carDocHasImageThumbnail(d))),
    [docs],
  )

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

  const washPhotosDisplay = useMemo(() => washPhotos.map((u) => resolvePublicMediaUrl(u)), [washPhotos])

  const washPhotosKey = useMemo(() => washPhotos.join('|'), [washPhotos])

  useEffect(() => {
    setWashIdx(0)
  }, [washPhotosKey])

  useEffect(() => {
    setOwnerDataExpanded(true)
    setCarDataExpanded(true)
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

  /** Последняя запись в истории от детейлинга — иначе показываем «в гараже» и аватар владельца. */
  const lastVisitFromDetailing = useMemo(
    () => Boolean(lastHistoryEvent && String(lastHistoryEvent.source || '') === 'service'),
    [lastHistoryEvent],
  )

  const ownerGarageAvatarResolved = useMemo(() => {
    const raw = String(owner?.garageAvatar || '').trim()
    return raw ? resolvePublicMediaUrl(raw) : ''
  }, [owner?.garageAvatar])

  const servicingAtDetailingName = useMemo(() => {
    if (!lastHistoryEvent || String(lastHistoryEvent.source || '') !== 'service') return ''
    const dn = String(lastHistoryEvent.detailingName || '').trim()
    if (dn) return dn
    return (
      String(car?.detailingName || '').trim() ||
      String(ownerServiceSummary?.serviceName || '').trim() ||
      'Сервис'
    )
  }, [lastHistoryEvent, car, ownerServiceSummary])

  const servicingAtDetailingLogo = useMemo(() => {
    if (!lastHistoryEvent || String(lastHistoryEvent.source || '') !== 'service') return ''
    const le = String(lastHistoryEvent.detailingLogo || '').trim()
    if (le) return resolvePublicMediaUrl(le)
    const cf = String(car?.detailingLogo || '').trim()
    if (cf) return resolvePublicMediaUrl(cf)
    return ''
  }, [lastHistoryEvent, car])

  const ownerApprovedServicingHeadline = useMemo(() => {
    if (lastVisitFromDetailing) {
      const name = servicingAtDetailingName || 'Сервис'
      const at = lastHistoryEvent?.at
      if (at) return `Обслуживается: ${name}, ${fmtDateTime(at)}`
      return `Обслуживается: ${name}`
    }
    return 'Обслуживается: В гараже'
  }, [lastVisitFromDetailing, servicingAtDetailingName, lastHistoryEvent?.at])

  const lastVisitDocs = useMemo(() => {
    if (!lastHistoryEvent?.id) return []
    const evId = String(lastHistoryEvent.id)
    const list = (Array.isArray(allCarDocs) ? allCarDocs : []).filter(
      (d) => d && String(d.eventId || '') === evId && String(d.url || '').trim(),
    )
    const photos = list.filter((d) => String(d.kind || 'photo') === 'photo')
    return photos.length ? photos : list
  }, [allCarDocs, lastHistoryEvent?.id])

  /** Превью как в гараже: документ визита, иначе обложка / фото после мойки на карточке авто */
  const lastVisitPreviewPhotoUrl = useMemo(() => {
    const docUrl = String(lastVisitDocs[0]?.url || '').trim()
    if (docUrl) return docUrl
    if (!car) return ''
    const hero = String(car.hero || '').trim()
    if (hero) return hero
    const wash = Array.isArray(car.washPhotos) ? car.washPhotos : []
    const w0 = wash.map((x) => String(x || '').trim()).find(Boolean)
    if (w0) return w0
    return String(car.washPhoto || '').trim()
  }, [lastVisitDocs, car])

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

  const copyOwnerCarVin = useCallback(async () => {
    const v = String(car?.vin || '').trim()
    if (!v) return
    const doneFlash = () => {
      if (vinCopyTimerRef.current) window.clearTimeout(vinCopyTimerRef.current)
      setVinCopyFlash(true)
      vinCopyTimerRef.current = window.setTimeout(() => {
        setVinCopyFlash(false)
        vinCopyTimerRef.current = null
      }, 2000)
    }
    try {
      await navigator.clipboard.writeText(v)
      doneFlash()
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = v
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        doneFlash()
      } catch {
        alert('Не удалось скопировать в буфер обмена')
      }
    }
  }, [car?.vin])

  if ((mode === 'owner' || mode === 'detailing') && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  if (!dataReady) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
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
  const newVisitPath = buildCarSubRoutePath(id, 'history', fromParam, { new: '1' })
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
  const ownerLastVisitPath = lastHistoryEvent
    ? buildCarSubRoutePath(id, 'history', fromParam, { visit: String(lastHistoryEvent.id) })
    : ''

  const washAfterCareEl = (
    <div className="topBorder carPage__washAfterCare">
      <div className="row spread gap">
        <div>
          <div className="cardTitle" style={{ marginBottom: 0 }}>
            Фото после ухода
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {carDataExpanded
              ? 'Обновляется автоматически после визита с услугами ухода за кузовом. Удалить фото можно в разделе «Редактировать» карточки.'
              : 'Фото после визита с услугами ухода.'}
          </div>
        </div>
      </div>

      {washPhotos.length ? (
        <div className="washGallery">
          <div className="washViewer">
            <a
              className="washGallery__viewer"
              href={washPhotosDisplay[washIdx]}
              target="_blank"
              rel="noreferrer"
              title="Открыть фото"
            >
              <img alt="Фото после ухода" src={washPhotosDisplay[washIdx]} />
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
  )

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
            <div className="carPage__titleNameRow">
              <h1 className="h1" style={{ margin: 0 }}>
                {car.make} {car.model}
              </h1>
              {mode === 'owner' || mode === 'detailing' ? (
                <Link
                  className="btn carPage__titleVisitBtn"
                  data-variant="primary"
                  to={newVisitPath}
                  aria-label="Новый визит"
                  title="Новый визит"
                >
                  Визит
                </Link>
              ) : null}
            </div>
          </div>
          <p className="muted carPage__meta">
            <span>{car.city || '—'}</span>
            <span aria-hidden="true"> · </span>
            <span className="mono" title="Госномер">
              {fmtPlateFull(car.plate, car.plateRegion) || '—'}
            </span>
            <span aria-hidden="true"> · </span>
            {mode === 'owner' && car.vin ? (
              <button
                type="button"
                className="carPage__metaVinBtn"
                onClick={() => void copyOwnerCarVin()}
                title={vinCopyFlash ? 'Скопировано' : 'Скопировать идентификатор'}
                aria-label={vinCopyFlash ? 'Скопировано в буфер обмена' : `Скопировать идентификатор: ${car.vin}`}
              >
                <span className="mono">{car.vin}</span>
              </button>
            ) : (
              <span className="mono" title="Идентификатор авто">
                {car.vin || '—'}
              </span>
            )}
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
        style={car.hero ? { backgroundImage: resolvedBackgroundImageUrl(car.hero) } : undefined}
      >
        <div className="carHero__overlay">
          {mode === 'owner' || mode === 'detailing' ? (
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
            </div>
          ) : null}
          <div className="row gap wrap carHero__pills">
            <Pill>Цвет: {car.color || '—'}</Pill>
            <Pill>Год: {car.year != null && car.year !== '' ? car.year : '—'}</Pill>
            <Pill>Пробег: {fmtKm(displayMileageKm)}</Pill>
          </div>
        </div>
      </div>

      {mode === 'detailing' &&
      detailingAccess?.label &&
      detailingAccess.label !== DETAILING_ACCESS_SERVICE_ONLY_LABEL ? (
        <Card className="card pad" style={{ marginBottom: 16 }}>
          <div className="cardTitle" style={{ marginBottom: 8 }}>
            Клиент и доступ
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <Pill tone={detailingAccess.tone}>{detailingAccess.label}</Pill>
          </div>
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
                  Сервис и история
                </div>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--suffix"
                  aria-expanded={ownerDataExpanded ? 'true' : 'false'}
                  onClick={() => setOwnerDataExpanded((v) => !v)}
                  title={ownerDataExpanded ? 'Свернуть' : 'Развернуть'}
                  aria-label={
                    ownerDataExpanded ? 'Свернуть раздел «Сервис и история»' : 'Развернуть раздел «Сервис и история»'
                  }
                >
                  <DropdownCaretIcon open={ownerDataExpanded} />
                </button>
              </div>

              {ownerDataExpanded ? (
                <div className="carPage__ownerServiceExpand">
                  {ownerServiceSummary.kind === 'no_service' ? (
                    <div className="carPage__ownerServiceSection carPage__ownerServiceSection--stack">
                      {lastHistoryEvent && ownerLastVisitPath ? (
                        <CarPageOwnerLastVisitPreview
                          lastEvt={lastHistoryEvent}
                          photoUrl={lastVisitPreviewPhotoUrl}
                          histPath={ownerLastVisitPath}
                        />
                      ) : (
                        <p className="muted small" style={{ margin: 0 }}>
                          Пока нет сохранённых визитов. Добавьте запись в разделе «История авто».
                        </p>
                      )}
                      <p className="muted small" style={{ margin: 0 }}>
                        Привязка к партнёру на улице добавит записи «от сервиса» в историю.
                      </p>
                      <div className="row gap wrap" style={{ margin: 0 }}>
                        <Link className="btn" data-variant="primary" to="/market">
                          Открыть улицу
                        </Link>
                      </div>
                    </div>
                  ) : ownerServiceSummary.ownerLink === 'approved' || ownerServiceSummary.ownerLink === 'implicit' ? (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div
                        className="carPage__historyServiceAvatar"
                        title={ownerApprovedServicingHeadline}
                        aria-label={ownerApprovedServicingHeadline}
                      >
                        {lastVisitFromDetailing ? (
                          servicingAtDetailingLogo ? (
                            <img alt="" src={servicingAtDetailingLogo} />
                          ) : (
                            <DefaultAvatar alt="" />
                          )
                        ) : ownerGarageAvatarResolved ? (
                          <img alt="" src={ownerGarageAvatarResolved} />
                        ) : (
                          <DefaultAvatar alt="" />
                        )}
                      </div>
                      <div className="carPage__ownerServiceStack">
                        <div className="metaStrong carPage__ownerServiceHeadline">{ownerApprovedServicingHeadline}</div>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <CarPageOwnerLastVisitPreview
                            lastEvt={lastHistoryEvent}
                            photoUrl={lastVisitPreviewPhotoUrl}
                            histPath={ownerLastVisitPath}
                          />
                        ) : (
                          <p className="muted small" style={{ margin: 0 }}>
                            Пока нет сохранённых визитов.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : ownerServiceSummary.ownerLink === 'pending' ? (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div className="carPage__historyServiceAvatar" aria-hidden="true">
                        <DefaultAvatar alt="" />
                      </div>
                      <div className="carPage__ownerServiceStack">
                        <div className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</div>
                        <div className="row gap wrap" style={{ margin: 0, alignItems: 'center' }}>
                          <Pill tone="neutral">Заявка на рассмотрении</Pill>
                        </div>
                        <p className="muted small" style={{ margin: 0 }}>
                          Детейлинг проверит заявку. После одобрения авто появится в вашем гараже со всей историей сервиса.
                        </p>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <CarPageOwnerLastVisitPreview
                            lastEvt={lastHistoryEvent}
                            photoUrl={lastVisitPreviewPhotoUrl}
                            histPath={ownerLastVisitPath}
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="row gap wrap carPage__ownerServiceSection" style={{ alignItems: 'flex-start' }}>
                      <div className="carPage__historyServiceAvatar" aria-hidden="true">
                        <DefaultAvatar alt="" />
                      </div>
                      <div className="carPage__ownerServiceStack">
                        <div className="metaStrong">Сервис: {ownerServiceSummary.serviceName}</div>
                        <div className="row gap wrap" style={{ margin: 0, alignItems: 'center' }}>
                          <Pill tone="neutral">Заявка отклонена</Pill>
                        </div>
                        <p className="muted small" style={{ margin: 0 }}>
                          Уточните данные и попробуйте снова через улицу или свяжитесь с сервисом напрямую.
                        </p>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <CarPageOwnerLastVisitPreview
                            lastEvt={lastHistoryEvent}
                            photoUrl={lastVisitPreviewPhotoUrl}
                            histPath={ownerLastVisitPath}
                          />
                        ) : null}
                        <div className="row gap wrap" style={{ margin: 0 }}>
                          <Link className="btn" data-variant="primary" to="/market">
                            Улица
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="topBorder carPage__carDataSection">
                <div className="row spread gap carPage__ownerDataBar carPage__carDataBar" style={{ alignItems: 'center' }}>
                  <h2 className="h2 carPage__dataTitle">Данные авто:</h2>
                  <button
                    type="button"
                    className="dropdownCaretBtn dropdownCaretBtn--suffix"
                    aria-expanded={carDataExpanded ? 'true' : 'false'}
                    onClick={() => setCarDataExpanded((v) => !v)}
                    title={carDataExpanded ? 'Свернуть данные авто' : 'Развернуть данные авто'}
                    aria-label={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                  >
                    <DropdownCaretIcon open={carDataExpanded} />
                  </button>
                </div>
                {carDataExpanded ? (
                  <>
                    <div className="kv">
                      <div className="kv__row kv__row--vinOnly" role="group" aria-label="Идентификатор авто (VIN)">
                        <div className="kv__vinRowActions">
                          <span className="kv__v mono">{car.vin || '—'}</span>
                          {mode === 'owner' && car.vin ? (
                            <button
                              type="button"
                              className="btn carPage__copyVinBtn"
                              data-variant="ghost"
                              onClick={() => void copyOwnerCarVin()}
                            >
                              {vinCopyFlash ? 'Скопировано' : 'Копировать'}
                            </button>
                          ) : null}
                        </div>
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
                    {washAfterCareEl}
                  </>
                ) : (
                  <>
                    <div className="carPage__carDataCollapsedSummary muted small">
                      <div className="carPage__carDataCollapsedLine mono">{car.vin || '—'}</div>
                      {car.vin ? (
                        <div style={{ marginTop: 6, marginBottom: 8 }}>
                          <button
                            type="button"
                            className="btn carPage__copyVinBtn"
                            data-variant="ghost"
                            onClick={() => void copyOwnerCarVin()}
                          >
                            {vinCopyFlash ? 'Скопировано' : 'Копировать'}
                          </button>
                        </div>
                      ) : null}
                      <div className="carPage__carDataCollapsedLine">
                        <span className="mono">{fmtPlateFull(car.plate, car.plateRegion) || '—'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>год {car.year || '—'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>пробег {fmtKm(displayMileageKm)}</span>
                      </div>
                      <div className="carPage__carDataCollapsedLine carPage__carDataCollapsedLine--meta">
                        Обновлено: {fmtDateTime(car.updatedAt)}
                      </div>
                    </div>
                    {washAfterCareEl}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="row spread gap carPage__ownerDataBar carPage__carDataBar" style={{ alignItems: 'center' }}>
                <h2 className="h2 carPage__dataTitle">Данные авто:</h2>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--suffix"
                  aria-expanded={carDataExpanded ? 'true' : 'false'}
                  onClick={() => setCarDataExpanded((v) => !v)}
                  title={carDataExpanded ? 'Свернуть данные авто' : 'Развернуть данные авто'}
                  aria-label={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                >
                  <DropdownCaretIcon open={carDataExpanded} />
                </button>
              </div>
              {carDataExpanded ? (
                <>
                  <div className="kv">
                    <div className="kv__row kv__row--vinOnly" role="group" aria-label="Идентификатор авто (VIN)">
                      <div className="kv__vinRowActions">
                        <span className="kv__v mono">{car.vin || '—'}</span>
                        {mode === 'owner' && car.vin ? (
                          <button
                            type="button"
                            className="btn carPage__copyVinBtn"
                            data-variant="ghost"
                            onClick={() => void copyOwnerCarVin()}
                          >
                            {vinCopyFlash ? 'Скопировано' : 'Копировать'}
                          </button>
                        ) : null}
                      </div>
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
                  {washAfterCareEl}
                </>
              ) : (
                <>
                  <div className="carPage__carDataCollapsedSummary muted small">
                    <div className="carPage__carDataCollapsedLine mono">{car.vin || '—'}</div>
                    {mode === 'detailing' && (car.clientName || car.clientPhone || car.clientEmail) ? (
                      <div className="carPage__carDataCollapsedLine">
                        {[car.clientName, car.clientPhone, car.clientEmail].filter(Boolean).join(' · ')}
                      </div>
                    ) : null}
                    <div className="carPage__carDataCollapsedLine">
                      <span className="mono">{fmtPlateFull(car.plate, car.plateRegion) || '—'}</span>
                      <span aria-hidden="true"> · </span>
                      <span>год {car.year || '—'}</span>
                      <span aria-hidden="true"> · </span>
                      <span>пробег {fmtKm(displayMileageKm)}</span>
                    </div>
                    <div className="carPage__carDataCollapsedLine carPage__carDataCollapsedLine--meta">
                      Обновлено: {fmtDateTime(car.updatedAt)}
                    </div>
                  </div>
                  {washAfterCareEl}
                </>
              )}
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
                title={recsOpen ? 'Свернуть советы' : 'Открыть советы'}
              >
                <span className="carPage__recsSelectLabel">Советы</span>
                <span className="carPage__recsSelectChev" aria-hidden="true" />
              </button>
              <Link
                className="btn carPage__recsAddVisitBtn"
                data-variant="outline"
                to={newVisitPath}
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
                    <div className="recItem__row">
                      <span className="pill" data-tone={x.tone || 'neutral'}>
                        {x.tone === 'accent' ? 'Важно' : 'Совет'}
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
            <div className="col gap carPage__sectionRow carPage__sectionRow--history">
              <div className="carPage__sectionHead">
                <h2 className="h2 carPage__sectionTitle">История авто:</h2>
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
                          const historySvcLogo = String(
                            lastHistoryEvent.detailingLogo || car?.detailingLogo || '',
                          ).trim()
                          return (
                            <div
                              className="carPage__historyServiceAvatar"
                              title={serviceLabel}
                              aria-label={`Запись сервиса: ${serviceLabel}`}
                            >
                              {historySvcLogo ? (
                                <img alt="" src={resolvePublicMediaUrl(historySvcLogo)} />
                              ) : (
                                <DefaultAvatar alt="" />
                              )}
                            </div>
                          )
                        })()
                      )}
                    </div>
                    {(() => {
                      const e = lastHistoryEvent
                      const note = String(e.note || '').trim()
                      const ms = (Array.isArray(e.maintenanceServices) ? e.maintenanceServices : []).filter(Boolean)
                      const { wash, other } = splitWashDetailingServices(e.services)
                      const washF = wash.filter(Boolean)
                      const otherF = other.filter(Boolean)
                      const hasExtra = ms.length > 0 || washF.length > 0 || otherF.length > 0 || Boolean(note)
                      if (!hasExtra) return null
                      return (
                        <div className="carPage__historyLastDetails miniList" style={{ marginTop: 12 }}>
                          <div className="miniList__item" style={{ border: 'none', padding: 0, background: 'transparent' }}>
                            {ms.length ? (
                              <div className="rowItem__sub">
                                <span className="eventLabel">ТО:</span> {ms.join(', ')}
                              </div>
                            ) : null}
                            {washF.length ? (
                              <div className="rowItem__sub">
                                <span className="eventLabel">Уход:</span> {washF.join(', ')}
                              </div>
                            ) : null}
                            {otherF.length ? (
                              <div className="rowItem__sub">
                                <span className="eventLabel">Детейлинг:</span> {otherF.join(', ')}
                              </div>
                            ) : null}
                            {note ? (
                              <div className="rowItem__sub">
                                <span className="eventLabel">Комментарий:</span> {note}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <p className="muted small carPage__sectionMeta">Пока нет истории визитов</p>
                )}
              </div>
              <div className="carPage__historyHeaderActions">
                <OpenAction
                  to={buildCarSubRoutePath(id, 'history', fromParam)}
                  title="История авто"
                  aria-label="Открыть историю авто"
                />
              </div>
            </div>
          </Card>

          {mode === 'owner' ? (
            <Card className="card pad">
              <div className="row spread gap carPage__sectionRow carPage__sectionRow--center">
                <h2 className="h2 carPage__sectionTitle carPage__sectionTitle--solo">Документы:</h2>
                <OpenAction
                  to={buildCarSubRoutePath(id, 'docs', fromParam)}
                  title="Документы"
                  aria-label="Открыть документы"
                />
              </div>
              {docs.length ? (
                <div className="thumbs">
                  {docs.map((d) => {
                    const src = resolvePublicMediaUrl(d.url)
                    if (carDocHasImageThumbnail(d)) {
                      const gi = docGalleryItems.findIndex((g) => g.id === d.id)
                      return gi >= 0 ? (
                        <button
                          key={d.id}
                          type="button"
                          className="thumb thumb--lb"
                          aria-label={d.title ? `Открыть: ${d.title}` : 'Открыть'}
                          onClick={() =>
                            setPhotoLb({
                              items: docGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                              startIndex: gi,
                            })
                          }
                        >
                          <img alt={d.title} src={src} />
                        </button>
                      ) : (
                        <a key={d.id} className="thumb" href={src} target="_blank" rel="noreferrer">
                          <img alt={d.title} src={src} />
                        </a>
                      )
                    }
                    return (
                      <a
                        key={d.id}
                        className="thumb thumb--docFile"
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        title={d.title || 'Документ'}
                        aria-label={d.title ? `Открыть документ: ${d.title}` : 'Открыть документ'}
                      >
                        <span className="thumb__docBadge">{carDocFileBadgeLabel(d)}</span>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <div className="muted">Пока нет документов.</div>
              )}
            </Card>
          ) : null}
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

