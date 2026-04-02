import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Card, Input, OpenAction, Pill } from '../components.jsx'
import { fmtDateTime, fmtKm, fmtPlateFull, normDigits, normVin } from '../../lib/format.js'
import { WASH_SERVICE_MARKERS, splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { useDetailing } from '../useDetailing.js'

export default function MarketPage() {
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const [vin, setVin] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (mode !== 'owner' || !owner?.email) return <Navigate to="/auth" replace />

  const ownerEmail = owner.email
  const cars = r.listCars({ ownerEmail })
  const ownerClaims = r.listClaimsForOwner(ownerEmail)
  const pendingClaims = ownerClaims.filter((x) => x.status === 'pending')

  const listScope = { ownerEmail }

  return (
    <div className="container">
      <div className="row spread gap">
        <div className="marketHead">
          <div className="marketHead__titleRow">
            <div className="row gap wrap" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <BackNav />
              <h1 className="h1" style={{ margin: 0 }}>
                Мой гараж
              </h1>
            </div>
            <div className="marketHead__actions">
              <Link className="btn" data-variant="primary" to="/create">
                + Добавить авто
              </Link>
            </div>
          </div>
          <p className="muted">
            {cars.length} авто
            {owner?.isPremium ? (
              <>
                {' '}
                <Pill tone="accent">Premium</Pill>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="list">
        {cars.map((c) => {
          const evts = r.listEvents(c.id, listScope)
          const lastEvt = evts[0] || null
          const lastEvtPhotos =
            lastEvt && lastEvt.id ? r.listDocs(c.id, listScope, { eventId: lastEvt.id }) : []
          const lastEvtPhotoUrl = lastEvtPhotos[0]?.url || ''
          const lastEvtMs = Array.isArray(lastEvt?.maintenanceServices) ? lastEvt.maintenanceServices : []
          const { wash: lastEvtWash, other: lastEvtDet } = splitWashDetailingServices(lastEvt?.services)
          const lastEvtTitle = String(lastEvt?.title || '').trim()
          const lastEvtNote = String(lastEvt?.note || '').trim()
          const prevWashEvt =
            lastEvt && !lastEvtWash.length
              ? evts.find((e) => Array.isArray(e?.services) && e.services.some((s) => WASH_SERVICE_MARKERS.has(s))) ||
                null
              : null
          const prevWashList = prevWashEvt ? splitWashDetailingServices(prevWashEvt.services).wash : []
          return (
            <Link
              key={c.id}
              className="rowItem"
              to={`/car/${c.id}?from=${encodeURIComponent('/cars?hub=1')}`}
            >
              <div
                className="rowItem__img"
                style={c.hero ? { backgroundImage: `url("${String(c.hero).replaceAll('"', '%22')}")` } : undefined}
              />
              <div className="rowItem__main">
                <div className="rowItem__title">
                  {c.make} {c.model}
                </div>
                <div className="rowItem__meta carPage__meta">
                  {lastEvt ? (
                    <>
                      <span className="metaStrong">Последний визит</span>
                      <span aria-hidden="true"> · </span>
                      <span className="eventMeta__when">{lastEvt.at ? fmtDateTime(lastEvt.at) : '—'}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="eventMeta__km">{fmtKm(lastEvt.mileageKm)}</span>
                    </>
                  ) : (
                    <>
                      <span>{c.city || '—'}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="mono" title="Госномер">
                        {fmtPlateFull(c.plate, c.plateRegion) || '—'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        VIN: <span className="mono">{c.vin || '—'}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="rowItem__sub">
                  <div className="rowItem__lastEvt">
                    {lastEvtPhotoUrl ? (
                      <span
                        className="rowItem__lastEvtPhoto"
                        aria-hidden="true"
                        style={{ backgroundImage: `url("${String(lastEvtPhotoUrl).replaceAll('"', '%22')}")` }}
                      />
                    ) : null}
                    <div className="rowItem__lastEvtText">
                      {lastEvt ? (
                        <div className="rowItem__lastEvtName">{lastEvtTitle || 'Визит'}</div>
                      ) : (
                        <div className="rowItem__lastEvtTitle">
                          {`Цвет: ${c.color || '—'} · Год: ${
                            c.year != null && c.year !== '' ? c.year : '—'
                          } · Пробег: ${fmtKm(c.mileageKm)}`}
                        </div>
                      )}
                      {lastEvt ? (
                        <div className="rowItem__lastEvtMeta">
                          {lastEvtMs.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">ТО:</span> {lastEvtMs.join(', ')}
                            </div>
                          ) : null}
                          {lastEvtWash.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">Уход:</span> {lastEvtWash.join(', ')}
                            </div>
                          ) : null}
                          {lastEvtDet.length ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">Детейлинг:</span> {lastEvtDet.join(', ')}
                            </div>
                          ) : null}
                          {!lastEvtMs.length && !lastEvtWash.length && !lastEvtDet.length && lastEvtNote ? (
                            <div className="rowItem__lastEvtLine">
                              <span className="eventLabel">Комментарий:</span> {lastEvtNote}
                            </div>
                          ) : null}
                          {prevWashList.length ? (
                            <div className="rowItem__lastEvtLine rowItem__lastEvtLine--prevWash">
                              <span className="eventLabel">Уход</span>
                              {prevWashEvt?.at ? (
                                <span className="rowItem__lastEvtWashWhen">
                                  {` (${fmtDateTime(prevWashEvt.at)})`}
                                </span>
                              ) : null}
                              <span>: </span>
                              {prevWashList.join(', ')}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rowItem__aside rowItem__aside--hint">
                <OpenAction asSpan />
              </div>
            </Link>
          )
        })}
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="cardTitle">Добавить авто по VIN</div>
        <p className="muted small">
          Если детейлинг уже создал карточку, вы можете запросить доступ. Заявка уйдёт на модерацию в детейлинг.
        </p>
        <div className="row gap marketVinRow" style={{ marginTop: 10 }}>
          <Input
            className="input mono marketVinRow__input"
            placeholder="VIN…"
            value={vin}
            maxLength={17}
            onChange={(e) => setVin(normVin(e.target.value))}
          />
          <button
            className="btn marketVinRow__btn"
            data-variant="primary"
            onClick={() => {
              const v = normVin(vin)
              setVin(v)
              const res = r.findCarsByVin(v)
              setVinResults(res)
              if (!res.length) alert('В сервисе пока нет авто с таким VIN.')
            }}
          >
            Найти
          </button>
        </div>

        {pendingClaims.length ? (
          <div className="topBorder">
            <div className="muted small">Заявки на модерации: {pendingClaims.length}</div>
          </div>
        ) : null}

        {vinResults.length ? (
          <div className="topBorder">
            <div className="muted small" style={{ marginBottom: 10 }}>
              Найдено: {vinResults.length}
            </div>
            <div className="list">
              {vinResults.slice(0, 5).map((c) => {
                const alreadyMine = (c.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
                const ev = evidenceByCarId[c.id] || { make: '', year: '', color: '' }
                return (
                  <Card key={c.id} className="card pad">
                    <div className="muted small" style={{ marginBottom: 10 }}>
                      Подтвердите признаки авто (марка/год/цвет) — это уйдёт на модерацию в детейлинг.
                    </div>
                    <div className="row spread gap">
                      <div>
                        <div className="rowItem__title">
                          {c.make} {c.model}
                        </div>
                        <div className="rowItem__meta">
                          {c.year} · {c.city || '—'} · сервис: {c.seller?.name || '—'}
                        </div>
                      </div>
                      <button
                        className="btn"
                        data-variant="primary"
                        disabled={alreadyMine}
                        onClick={() => {
                          const claim = r.createClaim({ carId: c.id, ownerEmail, evidence: ev })
                          if (claim?.error === 'already_pending') {
                            alert('Заявка уже отправлена и ждёт подтверждения.')
                            return
                          }
                          if (claim?.error) {
                            alert('Не удалось отправить заявку.')
                            return
                          }
                          invalidateRepo()
                          alert('Заявка отправлена в детейлинг на подтверждение.')
                        }}
                      >
                        {alreadyMine ? 'Уже в гараже' : 'Запросить доступ'}
                      </button>
                    </div>

                    <div className="formGrid" style={{ marginTop: 10 }}>
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Марка</span>
                        </div>
                        <Input
                          className="input"
                          value={ev.make}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, make: e.target.value } }))
                          }
                          placeholder="Например: Volkswagen"
                        />
                      </div>
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Год</span>
                        </div>
                        <Input
                          className="input"
                          inputMode="numeric"
                          value={ev.year}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({
                              ...m,
                              [c.id]: { ...ev, year: normDigits(e.target.value, { max: 2100, maxLen: 4 }) },
                            }))
                          }
                          placeholder="Например: 2019"
                        />
                      </div>
                      <div className="field">
                        <div className="field__top">
                          <span className="field__label">Цвет</span>
                        </div>
                        <Input
                          className="input"
                          value={ev.color}
                          onChange={(e) =>
                            setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, color: e.target.value } }))
                          }
                          placeholder="Например: Чёрный"
                        />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
