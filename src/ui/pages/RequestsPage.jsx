import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, PageLoadSpinner, Pill, ServiceHint } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import { useAsyncActionLock } from '../useAsyncActionLock.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { displayRuPhone, fmtInt, fmtPlateFull } from '../../lib/format.js'

export default function RequestsPage() {
  const r = useRepo()
  const claimLock = useAsyncActionLock()
  const loc = useLocation()
  const { detailingId, detailing, mode, loading } = useDetailing()
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

  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  const pending = claims.filter((x) => x.status === 'pending')

  if (!ready) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
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
                  Владельцы запрашивают привязку авто к вашему кабинету. Аватар справа вверху ведёт на страницу гаража по адресу{' '}
                  <span className="mono">/g/…</span> (витрина может быть закрыта настройками владельца — страница всё равно откроется).
                  Если адрес <span className="mono">/g/…</span> не задан, аватар неактивен.
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
          const ownerGarageSlug = String(x.ownerGarageSlug || '').trim()
          const ownerAvatar = String(x.ownerGarageAvatar || '').trim()
          const ownerLabel = String(x.ownerName || '').trim() || String(x.ownerEmail || 'Владелец').trim()
          const ownerDisplayName = String(x.ownerName || '').trim() || String(x.ownerEmail || '').trim() || '—'
          const ownerEmailLine = String(x.ownerEmail || '').trim()
          const plateLine = car ? fmtPlateFull(car.plate, car.plateRegion) : ''
          const mileageLine = car != null ? `${fmtInt(Number(car.mileageKm) || 0)} км` : null
          const clientPhoneRaw = String(car?.clientPhone || '').trim()
          const { display: clientPhoneDisplay, telHref: clientPhoneTelHref } = displayRuPhone(clientPhoneRaw)
          const clientEmailLine = String(car?.clientEmail || '').trim()
          const evidencePhoneRaw = String(ev.contactPhone || '').trim()
          const { display: evidencePhoneDisplay, telHref: evidencePhoneTelHref } = displayRuPhone(evidencePhoneRaw)
          const garagePath = ownerGarageSlug ? `/g/${encodeURIComponent(ownerGarageSlug)}` : null
          const navState = { from: `${loc.pathname}${loc.search}` }
          const carHeroBg = car?.hero ? resolvedBackgroundImageUrl(car.hero) : undefined
          const avatarInner = ownerAvatar ? (
            <img src={resolvePublicMediaUrl(ownerAvatar)} alt="" />
          ) : (
            <DefaultAvatar alt="" />
          )
          const avatarCorner = garagePath ? (
            <Link
              className="requestsCard__avatarCorner requestsCard__ownerAvatar requestsCard__ownerAvatar--link"
              to={garagePath}
              state={navState}
              title={`Страница гаража владельца: ${ownerLabel}`}
              aria-label={`Открыть страницу гаража владельца ${ownerLabel}`}
            >
              {avatarInner}
            </Link>
          ) : (
            <span
              className="requestsCard__avatarCorner requestsCard__ownerAvatar requestsCard__avatarCorner--static"
              title="У владельца не задан адрес страницы гаража (/g/…)"
              role="img"
              aria-label={`Аватар владельца ${ownerLabel}, страница гаража не задана`}
            >
              {avatarInner}
            </span>
          )
          return (
            <Card key={x.id} className="card pad requestsCard">
              <div className="requestsCard__shell">
                {avatarCorner}
                <div className="requestsCard__main">
                  <div className="requestsCard__headline row gap wrap" style={{ alignItems: 'center' }}>
                    <span className="requestsCard__carTitle">{car ? `${car.make} ${car.model}` : 'Авто'}</span>
                    <Pill
                      tone={x.status === 'pending' ? 'accent' : x.status === 'approved' ? 'accent' : 'neutral'}
                      className="pill--statusRing"
                    >
                      {x.status === 'pending' ? 'ожидает' : x.status === 'approved' ? 'подтверждено' : 'отклонено'}
                    </Pill>
                  </div>

                  <div className="requestsCard__evidenceRow" style={{ marginTop: 12 }}>
                    <div
                      className={`requestsCard__carPhoto${carHeroBg ? '' : ' requestsCard__carPhoto--empty'}`}
                      style={carHeroBg ? { backgroundImage: carHeroBg } : undefined}
                      role={car?.hero ? 'img' : undefined}
                      aria-label={car?.hero ? 'Обложка автомобиля в карточке сервиса' : undefined}
                    />
                  </div>
                  <p className="muted small requestsCard__evidenceHint" style={{ marginTop: 10, marginBottom: 0 }}>
                    Сверьте заявителя с фото автомобиля и контактами в вашей карточке (телефон и почта клиента).
                  </p>

                  <div className="requestsCard__facts topBorder" style={{ marginTop: 14 }}>
                    {mileageLine != null ? (
                      <div className="requestsCard__factLine">
                        <span className="clientBlockLabel">Пробег:</span> {mileageLine}
                      </div>
                    ) : null}
                    <div className="requestsCard__factLine">
                      <span className="clientBlockLabel">Госномер:</span>{' '}
                      {plateLine ? <span className="mono">{plateLine}</span> : <span className="muted">не указан</span>}
                    </div>
                    <div className="requestsCard__factLine">
                      <span className="clientBlockLabel">Телефон в карточке:</span>{' '}
                      {clientPhoneTelHref ? (
                        <a className="rowItem__ownerSummaryPhone" href={clientPhoneTelHref}>
                          {clientPhoneDisplay}
                        </a>
                      ) : clientPhoneRaw ? (
                        <span>{clientPhoneDisplay || clientPhoneRaw}</span>
                      ) : (
                        <span className="muted">не указан</span>
                      )}
                    </div>
                    <div className="requestsCard__factLine">
                      <span className="clientBlockLabel">Почта в карточке:</span>{' '}
                      {clientEmailLine ? <span className="mono">{clientEmailLine}</span> : <span className="muted">не указана</span>}
                    </div>
                    {evidencePhoneRaw ? (
                      <div className="requestsCard__factLine">
                        <span className="clientBlockLabel">Телефон для сверки (в заявке):</span>{' '}
                        {evidencePhoneTelHref ? (
                          <a className="rowItem__ownerSummaryPhone" href={evidencePhoneTelHref}>
                            {evidencePhoneDisplay}
                          </a>
                        ) : (
                          <span>{evidencePhoneDisplay || evidencePhoneRaw}</span>
                        )}
                      </div>
                    ) : null}
                    <div className="requestsCard__factLine">
                      <span className="clientBlockLabel">Заявитель:</span>{' '}
                      <span className="requestsCard__clientName">{ownerDisplayName}</span>
                    </div>
                    <div className="muted small requestsCard__factLine requestsCard__ownerEmailLine">
                      {ownerEmailLine ? <span className="mono">{ownerEmailLine}</span> : <span className="muted">—</span>}
                      {garagePath ? (
                        <>
                          <span className="requestsCard__ownerLineSep" aria-hidden="true">
                            {' '}
                            ·{' '}
                          </span>
                          <Link className="requestsCard__ownerPublicLink" to={garagePath} state={navState}>
                            открыть /g/…
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {x.status === 'pending' ? (
                    <div className="requestsCard__footer row gap wrap">
                      <button
                        className="btn"
                        data-variant="primary"
                        type="button"
                        disabled={claimLock.pending}
                        aria-busy={claimLock.pending || undefined}
                        onClick={() =>
                          void claimLock.run(async () => {
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
                          })
                        }
                      >
                        Подтвердить
                      </button>
                      <button
                        className="btn"
                        data-variant="danger"
                        type="button"
                        disabled={claimLock.pending}
                        aria-busy={claimLock.pending || undefined}
                        onClick={() =>
                          void claimLock.run(async () => {
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
                          })
                        }
                      >
                        Отклонить
                      </button>
                    </div>
                  ) : null}
                </div>
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
