import { Link } from 'react-router-dom'
import { useRepo } from './useRepo.js'
import { OpenAction } from './components.jsx'
import { fmtDateTime, fmtKm, fmtPlateFull } from '../lib/format.js'
import { WASH_SERVICE_MARKERS, splitWashDetailingServices } from '../lib/serviceCatalogs.js'
import { buildCarFromQuery } from './carNav.js'

/** Список авто владельца на `/cars` или `/garage`, с единым `from` для возврата из карточки. */
export function OwnerGarageCarList({ ownerEmail, fromPath = '/cars' }) {
  const r = useRepo()
  const cars = r.listCars({ ownerEmail })
  const listScope = { ownerEmail }
  const fromQ = buildCarFromQuery(fromPath)

  return (
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
          <Link key={c.id} className="rowItem" to={`/car/${c.id}${fromQ}`}>
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
                  <div className="rowItem__lastEvtTop">
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
                    </div>
                  </div>
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
            <div className="rowItem__aside rowItem__aside--hint">
              <OpenAction asSpan />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
