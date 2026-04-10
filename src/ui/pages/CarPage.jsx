import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { BackNav, Card, DropdownCaretIcon, OpenAction, PageLoadSpinner, Pill } from '../components.jsx'
import { displayRuPhone, fmtDate, fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { normalizeCarEventServices, splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { buildCarSubRoutePath, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import {
  detailingCarAccessBadge,
  detailingCarHasLinkedOwner,
  ownerServiceLinkSummary,
} from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { carDocFileBadgeLabel, carDocHasImageThumbnail } from '../../lib/carDocDisplay.js'
import { VISIT_COMMENT_EMPTY_HINT } from '../../lib/visitCommentCopy.js'
import {
  initialCarDataExpanded,
  initialLastVisitExpanded,
  patchCarPageExpandPrefs,
  readCarPageExpandPrefs,
} from '../../lib/carPageExpandPrefs.js'
import { resolveEffectiveMileageKm } from '../../lib/carMileage.js'
function CarPageOwnerLastVisitPreview({ lastEvt, histPath }) {
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
  const showAt = Boolean(lastEvt.at)
  const showKm = lastEvt.mileageKm != null && lastEvt.mileageKm !== ''
  return (
    <Link className="carPage__ownerLastVisitHit" to={histPath} aria-label={`Открыть визит: ${headline}`}>
      <div className="carPage__ownerLastVisitHead">
        <span className="metaStrong">Последний визит:</span>
        {showAt || showKm ? (
          <>
            <span className="carPage__ownerLastVisitMetaSep" aria-hidden="true">
              {' '}
              ·{' '}
            </span>
            {showAt ? <span className="carPage__ownerLastVisitMetaVal">{fmtDate(lastEvt.at)}</span> : null}
            {showAt && showKm ? (
              <span className="carPage__ownerLastVisitMetaSep" aria-hidden="true">
                {' '}
                ·{' '}
              </span>
            ) : null}
            {showKm ? <span className="carPage__ownerLastVisitMetaVal">{fmtKm(lastEvt.mileageKm)}</span> : null}
          </>
        ) : null}
      </div>
      <div className="carPage__ownerLastVisitAbout">
        <span className="eventLabel">О визите:</span>{' '}
        <span className="carPage__ownerLastVisitTitleText">{headline}</span>
      </div>
      <div className="rowItem__lastEvtMeta carPage__ownerLastVisitServices">
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
        <div className="rowItem__lastEvtLine">
          <span className="eventLabel">Комментарий:</span>{' '}
          {note ? note : <span className="muted">{VISIT_COMMENT_EMPTY_HINT}</span>}
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

  const ownerLastVisitExpandRef = useRef(null)

  useLayoutEffect(() => {
    if (mode !== 'owner' || !ownerServiceSummary || !ownerDataExpanded) return undefined
    const el = ownerLastVisitExpandRef.current
    if (!el) return undefined

    const clearBleed = () => {
      el.style.width = ''
      el.style.marginLeft = ''
      el.style.maxWidth = ''
    }

    const syncFullWidth = () => {
      const rect = el.getBoundingClientRect()
      const docW = document.documentElement.clientWidth
      el.style.width = `${docW}px`
      el.style.marginLeft = `${-Math.round(rect.left)}px`
      el.style.maxWidth = 'none'
    }

    let scrollRaf = 0
    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        syncFullWidth()
      })
    }

    syncFullWidth()
    const ro = new ResizeObserver(() => syncFullWidth())
    ro.observe(document.documentElement)
    window.addEventListener('resize', syncFullWidth)
    window.addEventListener('orientationchange', syncFullWidth)
    window.addEventListener('scroll', onScroll, true)

    return () => {
      clearBleed()
      ro.disconnect()
      window.removeEventListener('resize', syncFullWidth)
      window.removeEventListener('orientationchange', syncFullWidth)
      window.removeEventListener('scroll', onScroll, true)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
    }
  }, [ownerDataExpanded, mode, ownerServiceSummary, id])

  const detailingAccess = useMemo(() => {
    if (mode !== 'detailing' || !car) return null
    return detailingCarAccessBadge(car, detailingId, inboxClaims)
  }, [mode, car, detailingId, inboxClaims])

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
      if (at) return `Обслуживался: ${name}, ${fmtDateTime(at)}`
      return `Обслуживался: ${name}`
    }
    return 'Обслуживался: в гараже'
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

  /** Только файлы, привязанные к последнему визиту (без фото с карточки — иначе путаница для СТО и владельца). */
  const lastVisitGalleryRawUrls = useMemo(
    () => lastVisitDocs.map((d) => String(d.url || '').trim()).filter(Boolean),
    [lastVisitDocs],
  )

  const visitGalleryDisplay = useMemo(
    () => lastVisitGalleryRawUrls.map((u) => resolvePublicMediaUrl(u)),
    [lastVisitGalleryRawUrls],
  )

  const visitGalleryKey = useMemo(() => lastVisitGalleryRawUrls.join('|'), [lastVisitGalleryRawUrls])

  useEffect(() => {
    setWashIdx(0)
  }, [visitGalleryKey])

  useLayoutEffect(() => {
    if (!id) return
    const p = readCarPageExpandPrefs(mode, id)
    setOwnerDataExpanded(initialLastVisitExpanded(p))
    setCarDataExpanded(initialCarDataExpanded(p))
  }, [id, mode])

  const displayMileageKm = useMemo(() => {
    if (!car) return 0
    return resolveEffectiveMileageKm(car, allEvents)
  }, [car, allEvents])

  /** Подпись места для блока «Фото последнего визита»: сервис или в гараже. */
  const lastVisitPlaceLabel = useMemo(() => {
    if (!lastHistoryEvent) return ''
    if (String(lastHistoryEvent.source || '') === 'service') {
      return (
        String(lastHistoryEvent.detailingName || '').trim() ||
        String(car?.detailingName || '').trim() ||
        'Сервис'
      )
    }
    return 'В гараже'
  }, [lastHistoryEvent, car?.detailingName])

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

  const detailingOwnerGarageCityLine = String(car.ownerGarageCity || '').trim() || 'Нет данных'
  const detailingOwnerAccountPhoneRaw = String(car.ownerAccountPhone || '').trim()
  const detailingOwnerAccountPhoneUi = displayRuPhone(detailingOwnerAccountPhoneRaw)
  const detailingClientCardName =
    String(car.clientName || '').trim() || String(car.clientPhone || '').trim() || ''
  const detailingClientPhoneRaw = String(car.clientPhone || '').trim()
  const detailingClientPhoneUi = displayRuPhone(detailingClientPhoneRaw)

  const lastVisitPhotosMetaDetailing =
    lastHistoryEvent ? (
      <>
        {lastHistoryEvent.at ? (
          <>
            <span className="metaStrong">{fmtDateTime(lastHistoryEvent.at)}</span>
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        <span>{lastVisitPlaceLabel}</span>
      </>
    ) : (
      <>Пока нет записей в истории — после первого визита здесь появятся дата и место обслуживания.</>
    )

  const lastVisitPhotosMetaOwnerEmbed = lastHistoryEvent ? (
    <span>{lastVisitPlaceLabel}</span>
  ) : (
    <>Пока нет записей в истории — после первого визита здесь появятся дата и место обслуживания.</>
  )

  const lastVisitPhotosGalleryBlock = lastVisitGalleryRawUrls.length ? (
    <div className="washGallery carPage__lastVisitPhotosGallery">
      <div className="washViewer">
        <a
          className="washGallery__viewer"
          href={visitGalleryDisplay[washIdx]}
          target="_blank"
          rel="noreferrer"
          title="Открыть фото"
        >
          <img alt="Фото последнего визита" src={visitGalleryDisplay[washIdx]} />
        </a>
      </div>
      <div className="washGallery__controls">
        <div className="row gap">
          <button
            type="button"
            className="btn"
            data-variant="ghost"
            onClick={() =>
              setWashIdx((i) =>
                lastVisitGalleryRawUrls.length
                  ? (i - 1 + lastVisitGalleryRawUrls.length) % lastVisitGalleryRawUrls.length
                  : 0,
              )
            }
            disabled={lastVisitGalleryRawUrls.length <= 1}
          >
            ←
          </button>
          <button
            type="button"
            className="btn"
            data-variant="ghost"
            onClick={() =>
              setWashIdx((i) =>
                lastVisitGalleryRawUrls.length ? (i + 1) % lastVisitGalleryRawUrls.length : 0,
              )
            }
            disabled={lastVisitGalleryRawUrls.length <= 1}
          >
            →
          </button>
        </div>
        <div className="washGallery__dots" aria-label="Фото">
          {lastVisitGalleryRawUrls.slice(0, 12).map((_, idx) => (
            <span key={idx} className={`washGallery__dot ${idx === washIdx ? 'is-active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="muted small carPage__lastVisitPhotosEmpty">
      Пока нет фото этого визита. Добавьте снимки к записи в «Истории авто».
    </div>
  )

  const lastVisitPhotosEmbedOwner = (
    <div className="carPage__lastVisitPhotosEmbed topBorder">
      <div className="cardTitle carPage__lastVisitPhotosTitle">Фото последнего визита</div>
      <div className="carPage__lastVisitPhotosMeta muted small">{lastVisitPhotosMetaOwnerEmbed}</div>
      {lastVisitPhotosGalleryBlock}
    </div>
  )

  const lastVisitPhotosCard = (
    <Card className="card pad carPage__lastVisitPhotosCard">
      <div className="cardTitle carPage__lastVisitPhotosTitle">Фото последнего визита</div>
      <div className="carPage__lastVisitPhotosMeta muted small">{lastVisitPhotosMetaDetailing}</div>
      {lastVisitPhotosGalleryBlock}
    </Card>
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
            <span className="mono" title="VIN">
              {car.vin || '—'}
            </span>
            {mode !== 'detailing' && lastServiceVisitAt ? (
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

      {mode === 'detailing' && car ? (
        <Card className="card pad carPage__detailingClientCard" style={{ marginBottom: 16 }}>
          <div className="carPage__detailingClientCardHead">
            <div className="cardTitle carPage__detailingClientCardTitle">Клиент и доступ</div>
            {detailingAccess?.label === 'Заявка владельца' ? (
              <Pill tone={detailingAccess.tone}>{detailingAccess.label}</Pill>
            ) : null}
          </div>
          {detailingCarHasLinkedOwner(car) ? (
            <div className="carPage__detailingOwnerProfile">
              <div
                className="carPage__detailingOwnerProfileAvatar"
                aria-hidden={car.ownerGarageAvatar ? undefined : true}
              >
                {car.ownerGarageAvatar ? (
                  <img alt="" src={resolvePublicMediaUrl(String(car.ownerGarageAvatar))} />
                ) : (
                  <DefaultAvatar alt="" />
                )}
              </div>
              <div className="carPage__detailingOwnerProfileBody">
                <div className="carPage__detailingOwnerProfileName">
                  {String(car.ownerName || '').trim() || 'Владелец'}
                </div>
                <div className="carPage__detailingOwnerProfileRow">
                  <span className="carPage__detailingOwnerProfileKey">Город:</span>{' '}
                  <span className="carPage__detailingOwnerProfileVal">{detailingOwnerGarageCityLine}</span>
                </div>
                <div className="carPage__detailingOwnerProfileRow">
                  <span className="carPage__detailingOwnerProfileKey">Телефон:</span>{' '}
                  {detailingOwnerAccountPhoneUi.telHref ? (
                    <a className="carPage__detailingOwnerProfilePhone" href={detailingOwnerAccountPhoneUi.telHref}>
                      {detailingOwnerAccountPhoneUi.display}
                    </a>
                  ) : detailingOwnerAccountPhoneRaw ? (
                    <span className="carPage__detailingOwnerProfileVal">
                      {detailingOwnerAccountPhoneUi.display || detailingOwnerAccountPhoneRaw}
                    </span>
                  ) : (
                    <span className="carPage__detailingOwnerProfileVal muted">Нет данных</span>
                  )}
                </div>
              </div>
            </div>
          ) : detailingAccess?.label === 'Заявка владельца' ? (
            <>
              <p className="muted small carPage__detailingClientHint">
                Владелец запросил привязку аккаунта к этой машине. Примите или отклоните заявку в разделе «Заявки».
              </p>
              <div className="row gap wrap carPage__detailingClientActions">
                <Link className="btn" data-variant="primary" to="/requests">
                  Перейти к заявкам
                </Link>
              </div>
            </>
          ) : (
            <div className="carPage__detailingOwnerProfile">
              <div className="carPage__detailingOwnerProfileAvatar" aria-hidden="true">
                <DefaultAvatar alt="" />
              </div>
              <div className="carPage__detailingOwnerProfileBody">
                <div className="carPage__detailingOwnerProfileName">
                  {detailingClientCardName || 'Нет данных'}
                </div>
                <div className="carPage__detailingOwnerProfileRow">
                  <span className="carPage__detailingOwnerProfileKey">Телефон:</span>{' '}
                  {detailingClientPhoneUi.telHref ? (
                    <a className="carPage__detailingOwnerProfilePhone" href={detailingClientPhoneUi.telHref}>
                      {detailingClientPhoneUi.display}
                    </a>
                  ) : detailingClientPhoneRaw ? (
                    <span className="carPage__detailingOwnerProfileVal">
                      {detailingClientPhoneUi.display || detailingClientPhoneRaw}
                    </span>
                  ) : (
                    <span className="carPage__detailingOwnerProfileVal muted">Нет данных</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      <div className="split">
        <div className="col gap carPage__splitMainCol">
        <Card className="card pad">
          {mode === 'owner' && ownerServiceSummary ? (
            <>
              <div className="row spread gap carPage__ownerDataBar">
                <div className="cardTitle" style={{ margin: 0 }}>
                  Последний визит
                </div>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--suffix"
                  aria-expanded={ownerDataExpanded ? 'true' : 'false'}
                  onClick={() =>
                    setOwnerDataExpanded((v) => {
                      const next = !v
                      patchCarPageExpandPrefs(mode, id, { lastVisit: next })
                      return next
                    })
                  }
                  title={ownerDataExpanded ? 'Свернуть' : 'Развернуть'}
                  aria-label={
                    ownerDataExpanded ? 'Свернуть блок «Последний визит»' : 'Развернуть блок «Последний визит»'
                  }
                >
                  <DropdownCaretIcon open={ownerDataExpanded} />
                </button>
              </div>

              {ownerDataExpanded ? (
                <div ref={ownerLastVisitExpandRef} className="carPage__ownerLastVisitExpandBleed">
                  <div className="carPage__ownerServiceExpand">
                  {ownerServiceSummary.kind === 'no_service' ? (
                    <div className="carPage__ownerServiceSection carPage__ownerServiceSection--stack">
                      {lastHistoryEvent && ownerLastVisitPath ? (
                        <CarPageOwnerLastVisitPreview
                          lastEvt={lastHistoryEvent}
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
                        <div className="carPage__ownerServiceHeadline">
                          <span className="metaStrong">Обслуживался:</span>{' '}
                          <span className="carPage__ownerServiceHeadlineSub">
                            {lastVisitFromDetailing ? (
                              <>
                                {servicingAtDetailingName || 'Сервис'}
                                {lastHistoryEvent?.at ? (
                                  <>
                                    {', '}
                                    {fmtDateTime(lastHistoryEvent.at)}
                                  </>
                                ) : null}
                              </>
                            ) : (
                              'в гараже'
                            )}
                          </span>
                        </div>
                        {lastHistoryEvent && ownerLastVisitPath ? (
                          <CarPageOwnerLastVisitPreview
                            lastEvt={lastHistoryEvent}
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
                  {lastVisitPhotosEmbedOwner}
                </div>
              ) : null}

              <div className="topBorder carPage__carDataSection">
                <div className="row spread gap carPage__ownerDataBar carPage__carDataBar">
                  <h2 className="h2 carPage__dataTitle">Данные автомобиля</h2>
                  <button
                    type="button"
                    className="dropdownCaretBtn dropdownCaretBtn--suffix"
                    aria-expanded={carDataExpanded ? 'true' : 'false'}
                    onClick={() =>
                      setCarDataExpanded((v) => {
                        const next = !v
                        patchCarPageExpandPrefs(mode, id, { carData: next })
                        return next
                      })
                    }
                    title={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                    aria-label={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                  >
                    <DropdownCaretIcon open={carDataExpanded} />
                  </button>
                </div>
                {carDataExpanded ? (
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
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="row spread gap carPage__ownerDataBar carPage__carDataBar">
                <h2 className="h2 carPage__dataTitle">Данные автомобиля</h2>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--suffix"
                  aria-expanded={carDataExpanded ? 'true' : 'false'}
                  onClick={() =>
                    setCarDataExpanded((v) => {
                      const next = !v
                      patchCarPageExpandPrefs(mode, id, { carData: next })
                      return next
                    })
                  }
                  title={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                  aria-label={carDataExpanded ? 'Свернуть данные автомобиля' : 'Развернуть данные автомобиля'}
                >
                  <DropdownCaretIcon open={carDataExpanded} />
                </button>
              </div>
              {carDataExpanded ? (
                <div className="kv">
                  <div className="kv__row">
                    <span className="kv__k">VIN</span>
                    <span className="kv__v mono">{car.vin || '—'}</span>
                  </div>
                  <div className="kv__row">
                    <span className="kv__k">Госномер</span>
                    <span className="kv__v mono">{fmtPlateFull(car.plate, car.plateRegion) || '—'}</span>
                  </div>
                  {mode === 'detailing' && (car.clientName || car.clientPhone) ? (
                    <>
                      <div className="kv__row">
                        <span className="kv__k">Клиент</span>
                        <span className="kv__v">{car.clientName || '—'}</span>
                      </div>
                      <div className="kv__row">
                        <span className="kv__k">Телефон</span>
                        <span className="kv__v mono">{car.clientPhone || '—'}</span>
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
              ) : null}
            </>
          )}
        </Card>
        {mode === 'owner' && ownerServiceSummary ? null : lastVisitPhotosCard}
        </div>

        <div className="col gap">
          <Card className="card pad">
            <div className="carPage__recsBar">
              <button
                type="button"
                className="carPage__recsSelect"
                aria-expanded={recsOpen ? 'true' : 'false'}
                aria-haspopup="true"
                onClick={() => setRecsOpen((v) => !v)}
                title={recsOpen ? 'Свернуть совет' : 'Открыть совет'}
              >
                <span className="carPage__recsSelectLabel">Совет</span>
                <span className="carPage__recsSelectChev" aria-hidden="true" />
              </button>
              <Link
                className="btn carPage__recsAddVisitBtn"
                data-variant="outline"
                to={newVisitPath}
                aria-label="Добавить визит"
                title="Добавить визит"
              >
                Добавить визит
              </Link>
            </div>
            {recsOpen ? (
              <div className="recList recList--singleAdvice">
                {recs[0]?.title ? <p className="carPage__recsAdviceText">{recs[0].title}</p> : null}
              </div>
            ) : null}
          </Card>

          <Card className="card pad">
            <div className="row spread gap carPage__sectionRow carPage__sectionRow--center carPage__historyRow">
              <h2 className="h2 carPage__sectionTitle carPage__sectionTitle--solo">История авто</h2>
              <OpenAction
                to={buildCarSubRoutePath(id, 'history', fromParam)}
                title="Открыть историю обслуживания"
                aria-label="Открыть историю обслуживания авто"
              />
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

