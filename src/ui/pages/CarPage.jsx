import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, OpenAction, Pill, ServiceHint } from '../components.jsx'
import { fmtDate, fmtDateTime, fmtKm, fmtPlateFull, ownerPublicFlagTrue } from '../../lib/format.js'
import { CAR_CARE_RECS_HINT, CAR_SERVICE_ACCESS_HINT, CAR_WASH_PHOTOS_HINT } from '../../lib/historyVisitHints.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'
import { splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { buildCarSubRoutePath, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import { detailingCarAccessBadge, ownerServiceLinkSummary } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { VISIT_MAX_PHOTOS } from '../../lib/uploadLimits.js'

export default function CarPage() {
  const { id } = useParams()
  const pageLoc = useLocation()
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

  const clientOwner = useMemo(() => {
    if (mode !== 'detailing' || !car?.ownerEmail || !r.getOwner) return null
    return r.getOwner(car.ownerEmail)
  }, [mode, car?.ownerEmail, r])

  const clientSlug = String(clientOwner?.garageSlug || '').trim()
  const clientPublicUrl = useMemo(() => {
    if (!clientSlug || typeof window === 'undefined') return ''
    return `${window.location.origin}/g/${encodeURIComponent(clientSlug)}`
  }, [clientSlug])

  const [clientCopyHint, setClientCopyHint] = useState('')
  const copyClientPublicUrl = useCallback(async () => {
    if (!clientPublicUrl) return
    try {
      await navigator.clipboard.writeText(clientPublicUrl)
      setClientCopyHint('Ссылка скопирована')
      window.setTimeout(() => setClientCopyHint(''), 2200)
    } catch {
      setClientCopyHint('Не удалось скопировать')
      window.setTimeout(() => setClientCopyHint(''), 2500)
    }
  }, [clientPublicUrl])

  const clientActivityAt = useMemo(() => {
    if (!clientOwner?.email) return ''
    const a = clientOwner.lastVisitAt || clientOwner.createdAt || ''
    const b = clientOwner.updatedAt || clientOwner.createdAt || ''
    const ta = Date.parse(a) || 0
    const tb = Date.parse(b) || 0
    return ta >= tb ? a : b
  }, [clientOwner])

  const clientActivityLabel = useMemo(() => {
    if (!clientOwner?.email) return ''
    const a = clientOwner.lastVisitAt || clientOwner.createdAt || ''
    const b = clientOwner.updatedAt || clientOwner.createdAt || ''
    const ta = Date.parse(a) || 0
    const tb = Date.parse(b) || 0
    return ta >= tb ? 'Последний визит' : 'Профиль обновлён'
  }, [clientOwner])

  const clientDisplayName = String(clientOwner?.name || '').trim() || String(car?.ownerEmail || '').trim()
  const clientInitials = clientDisplayName.slice(0, 2).toUpperCase()
  const clientAvatar = String(clientOwner?.garageAvatar || '').trim()
  const clientCity = String(clientOwner?.garageCity || '').trim()
  const clientPhone = String(clientOwner?.phone || '').trim()
  const clientPhonePublic = ownerPublicFlagTrue(clientOwner?.showPhonePublic)

  const allEvents = useMemo(() => (id ? r.listEvents(id, scope) || [] : []), [id, r, scope])

  const washPhotos = useMemo(() => {
    if (!id) return []
    const head = allEvents[0]
    if (head?.id) {
      const urls = (r.listDocs(id, scope, { eventId: head.id }) || []).map((d) => d.url).filter(Boolean)
      if (urls.length) return urls.slice(0, VISIT_MAX_PHOTOS)
    }
    if (!car) return []
    return Array.isArray(car.washPhotos) ? car.washPhotos.filter(Boolean) : car.washPhoto ? [car.washPhoto] : []
  }, [allEvents, id, r, scope, car])

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
  const backTitle =
    mode === 'detailing'
      ? 'К кабинету'
      : listReturn === '/garage' || listReturn.startsWith('/garage?')
        ? 'В гараж'
        : 'К автомобилям'

  const lastHistoryEvent = allEvents[0] || null
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

  const ownerGarageCity = String(owner?.garageCity || '').trim()
  const ownerPhoneStr = String(owner?.phone || '').trim()
  const ownerTelHref = ownerPhoneStr ? `tel:${ownerPhoneStr.replace(/\s/g, '')}` : ''
  const serviceDetailingId = String(car?.detailingId || '').trim()
  const serviceLinkState = { from: `${pageLoc.pathname}${pageLoc.search}` }
  const ownerLinkedDetailing =
    serviceDetailingId && typeof r.getDetailing === 'function' ? r.getDetailing(serviceDetailingId) : null
  const ownerServiceDetLogo = String(ownerLinkedDetailing?.logo || '').trim()
  const ownerServiceDetInitials = String(ownerServiceSummary?.serviceName || 'С')
    .trim()
    .slice(0, 2)
    .toUpperCase()

  const ownerServiceCardDetailBlock =
    mode === 'owner' && ownerServiceSummary?.kind === 'service' ? (
      <div className="garageProfileCard__top" style={{ marginTop: 12, alignItems: 'flex-start' }}>
        <div className="garageProfileCard__main">
          <p className="metaStrong" style={{ margin: 0, lineHeight: 1.45 }}>
            Детейлинг:{' '}
            {serviceDetailingId ? (
              <Link
                className="carPage__serviceDetNameLink"
                to={`/d/${encodeURIComponent(serviceDetailingId)}`}
                state={serviceLinkState}
              >
                {ownerServiceSummary.serviceName}
              </Link>
            ) : (
              ownerServiceSummary.serviceName
            )}
          </p>
          <p className="muted small garageProfileCard__metaLine" style={{ marginTop: 8, marginBottom: 0 }}>
            <span className="garageProfileCard__metaKey">Город:</span> {ownerGarageCity || '—'}
          </p>
          <p className="muted small garageProfileCard__metaLine" style={{ marginTop: 6, marginBottom: 0 }}>
            <span className="garageProfileCard__metaKey">Телефон:</span>{' '}
            {ownerPhoneStr && ownerTelHref ? (
              <a href={ownerTelHref} className="requestsCard__ownerPublicLink">
                {ownerPhoneStr}
              </a>
            ) : (
              '—'
            )}
          </p>
          <p className="muted small garageProfileCard__metaLine" style={{ marginTop: 6, marginBottom: 0 }}>
            <span className="garageProfileCard__metaKey">Последний визит в сервис:</span>{' '}
            {lastServiceVisitAt ? fmtDate(lastServiceVisitAt) : '—'}
          </p>
        </div>
        <div className="garageProfileCard__avatarCol">
          <div
            className="garageProfileCard__avatar"
            aria-label={ownerServiceSummary.serviceName ? `Логотип: ${ownerServiceSummary.serviceName}` : 'Логотип сервиса'}
          >
            {ownerServiceDetLogo ? (
              <img src={ownerServiceDetLogo} alt="" />
            ) : (
              <span className="garageProfileCard__avatar--fallback" aria-hidden="true">
                {ownerServiceDetInitials}
              </span>
            )}
          </div>
        </div>
      </div>
    ) : null

  const ownerServiceAccessHintText =
    ownerServiceSummary?.kind === 'no_service'
      ? CAR_SERVICE_ACCESS_HINT.noService
      : ownerServiceSummary?.ownerLink === 'pending'
        ? CAR_SERVICE_ACCESS_HINT.pending
        : ownerServiceSummary?.ownerLink === 'rejected'
          ? CAR_SERVICE_ACCESS_HINT.rejected
          : CAR_SERVICE_ACCESS_HINT.linked

  const ownerServiceAccessHintScope = `car-service-access-${id}-${
    ownerServiceSummary?.kind === 'no_service'
      ? 'ns'
      : ownerServiceSummary?.ownerLink === 'pending'
        ? 'pd'
        : ownerServiceSummary?.ownerLink === 'rejected'
          ? 'rj'
          : 'ok'
  }`

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
          ) : null}
        </div>
      </div>

      {mode === 'owner' && ownerServiceSummary ? (
        <Card className="card pad" style={{ marginBottom: 16 }}>
          <div className="row gap wrap" style={{ alignItems: 'center', marginBottom: 8 }}>
            <div className="cardTitle" style={{ marginBottom: 0 }}>
              Сервис и доступ
            </div>
            <div className="carPage__recsHintWrap">
              <ServiceHint scopeId={ownerServiceAccessHintScope} variant="compact" label={CAR_SERVICE_ACCESS_HINT.label}>
                <p className="serviceHint__panelText">{ownerServiceAccessHintText}</p>
              </ServiceHint>
            </div>
          </div>
          {ownerServiceSummary.kind === 'no_service' ? (
            <div className="row gap wrap" style={{ marginTop: 2 }}>
              <Link className="btn" data-variant="primary" to="/market">
                Открыть витрину
              </Link>
            </div>
          ) : ownerServiceSummary.ownerLink === 'approved' || ownerServiceSummary.ownerLink === 'implicit' ? (
            <>{ownerServiceCardDetailBlock}</>
          ) : ownerServiceSummary.ownerLink === 'pending' ? (
            <>
              <div className="row gap wrap" style={{ alignItems: 'center' }}>
                <Pill tone="neutral">Заявка на рассмотрении</Pill>
              </div>
              {ownerServiceCardDetailBlock}
              <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
                Детейлинг проверит заявку. После одобрения авто появится в вашем гараже со всей историей сервиса.
              </p>
            </>
          ) : (
            <>
              <div className="row gap wrap" style={{ alignItems: 'center' }}>
                <Pill tone="neutral">Заявка отклонена</Pill>
              </div>
              {ownerServiceCardDetailBlock}
              <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
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
          {detailingAccess.label !== 'Владелец в приложении' ? (
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <Pill tone={detailingAccess.tone} className="pill--statusRing">
                {detailingAccess.label}
              </Pill>
            </div>
          ) : null}
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
            clientOwner ? (
              <div className="carClientOwnerPanel topBorder" style={{ marginTop: 14, paddingTop: 14 }}>
                <div className="garageProfileCard__top">
                  <div className="garageProfileCard__main">
                    {clientPublicUrl ? (
                      <button
                        type="button"
                        className="h2 garageProfileCard__nameAction"
                        onClick={copyClientPublicUrl}
                        title={`Скопировать ссылку: ${clientPublicUrl}`}
                        aria-label="Скопировать ссылку на публичную витрину клиента"
                      >
                        {clientDisplayName}
                      </button>
                    ) : (
                      <h2 className="h2 garageProfileCard__name">{clientDisplayName}</h2>
                    )}
                    {clientCopyHint ? (
                      <p className="muted small garageProfileCard__copyStatus" role="status">
                        {clientCopyHint}
                      </p>
                    ) : null}
                    <div className="row gap wrap" style={{ alignItems: 'center', marginTop: 8 }}>
                      <ServiceHint
                        scopeId={`car-client-vitrine-${id}`}
                        variant="compact"
                        label={
                          clientPublicUrl ? 'Справка: ссылка на витрину клиента' : 'Справка: публичная витрина клиента'
                        }
                      >
                        <p className="serviceHint__panelText">
                          {clientPublicUrl ? (
                            <>Нажмите на имя выше, чтобы скопировать ссылку на публичную витрину гостям.</>
                          ) : (
                            <>
                              Публичная витрина не задана. Почта в гараже:{' '}
                              <span className="mono">{car.ownerEmail}</span>
                            </>
                          )}
                        </p>
                      </ServiceHint>
                    </div>
                    <div className="garageProfileCard__meta">
                      <p className="muted small garageProfileCard__metaLine">
                        <span className="garageProfileCard__metaKey">Город:</span> {clientCity || '—'}
                      </p>
                      <p className="muted small garageProfileCard__metaLine">
                        <span className="garageProfileCard__metaKey">Телефон:</span>{' '}
                        {clientPhonePublic && clientPhone ? (
                          <a
                            href={`tel:${clientPhone.replace(/\s/g, '')}`}
                            className="requestsCard__ownerPublicLink"
                          >
                            {clientPhone}
                          </a>
                        ) : clientPhone ? (
                          <span title="Владелец не разрешил публикацию телефона на витрине">скрыт</span>
                        ) : (
                          '—'
                        )}
                      </p>
                      <p className="muted small garageProfileCard__metaLine">
                        <span className="garageProfileCard__metaKey">{clientActivityLabel}:</span>{' '}
                        {fmtDateTime(clientActivityAt) || '—'}
                      </p>
                    </div>
                    {clientSlug ? (
                      <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
                        <Link
                          className="requestsCard__ownerPublicLink"
                          to={`/g/${encodeURIComponent(clientSlug)}`}
                          state={{ from: `${pageLoc.pathname}${pageLoc.search}` }}
                        >
                          Открыть публичную страницу клиента
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <div className="garageProfileCard__avatarCol">
                    <div className="garageProfileCard__avatar">
                      {clientAvatar ? (
                        <img src={clientAvatar} alt="" />
                      ) : (
                        <span className="garageProfileCard__avatar--fallback">{clientInitials}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                В гараже клиента: <span className="mono">{car.ownerEmail}</span>
              </p>
            )
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
          <h2 className="h2">Данные автомобиля</h2>
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
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <div className="cardTitle" style={{ marginBottom: 0 }}>
                Фото последнего визита
              </div>
              <div className="carPage__recsHintWrap">
                <ServiceHint scopeId={`car-wash-photos-${id}`} variant="compact" label={CAR_WASH_PHOTOS_HINT.label}>
                  <p className="serviceHint__panelText">{CAR_WASH_PHOTOS_HINT.text}</p>
                </ServiceHint>
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
                    <img alt="Фото последнего визита" src={washPhotos[washIdx]} />
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
                    {washPhotos.map((_, idx) => (
                      <span key={idx} className={`washGallery__dot ${idx === washIdx ? 'is-active' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted small" style={{ marginTop: 10 }}>
                Пока нет фото у последнего визита — добавьте снимки при сохранении визита в «Истории».
              </div>
            )}
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad">
            <div className="carPage__recsHeader">
              <div className="carPage__recsHeaderMain">
                <button
                  type="button"
                  className="carPage__recsExpandTrigger"
                  id={`car-recs-trigger-${id}`}
                  aria-expanded={recsOpen}
                  aria-controls={`car-recs-panel-${id}`}
                  onClick={() => setRecsOpen((v) => !v)}
                >
                  <span className={`carPage__recsChev ${recsOpen ? 'is-open' : ''}`} aria-hidden="true" />
                  <span className="h2 carPage__recsExpandTitle">Рекомендации по уходу за автомобилем</span>
                </button>
                <div id={`car-care-recs-${id}`} className="carPage__recsHintWrap">
                  <ServiceHint scopeId={`car-care-recs-${id}`} variant="compact" label={CAR_CARE_RECS_HINT.label}>
                    <p className="serviceHint__panelText">{CAR_CARE_RECS_HINT.intro}</p>
                  </ServiceHint>
                </div>
              </div>
            </div>
            <div
              id={`car-recs-panel-${id}`}
              className={`carPage__recsCollapse ${recsOpen ? 'carPage__recsCollapse--open' : ''}`}
              role="region"
              aria-labelledby={`car-recs-trigger-${id}`}
              aria-hidden={!recsOpen}
            >
              <div className="carPage__recsCollapseInner">
                {recs.length ? (
                  <div className="recList carPage__recsList">
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
                ) : (
                  <p className="muted small carPage__recsEmpty">{CAR_CARE_RECS_HINT.emptyRecs}</p>
                )}
              </div>
            </div>
            <div className="carPage__recsAddVisitWrap">
              <Link
                className="btn carPage__recsAddVisitFull"
                data-variant="primary"
                to={buildCarSubRoutePath(id, 'history', fromParam, { new: '1' })}
              >
                + Добавить визит
              </Link>
            </div>
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">История обслуживания</h2>
              <OpenAction to={buildCarSubRoutePath(id, 'history', fromParam)} />
            </div>
            {lastHistoryEvent ? (
              <div className="miniList">
                <div className="miniList__item">
                  <div className="miniList__title metaStrong">{lastHistoryEvent.title || 'Визит'}</div>
                  <div className="miniList__meta">
                    <span className="eventMeta__when">{fmtDateTime(lastHistoryEvent.at)}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="eventMeta__km">{fmtKm(lastHistoryEvent.mileageKm)}</span>
                  </div>
                  {Array.isArray(lastHistoryEvent.maintenanceServices) && lastHistoryEvent.maintenanceServices.length ? (
                    <div className="rowItem__sub">
                      <span className="eventLabel">ТО:</span> {lastHistoryEvent.maintenanceServices.join(', ')}
                    </div>
                  ) : null}
                  {(() => {
                    const { wash, other } = splitWashDetailingServices(lastHistoryEvent.services)
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
              <div className="muted">Пока нет записей об обслуживании.</div>
            )}
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <h2 className="h2">Документы и фото автомобиля</h2>
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
