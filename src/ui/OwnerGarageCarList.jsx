import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRepo } from './useRepo.js'
import { OpenAction, PageLoadSpinner } from './components.jsx'
import { fmtKm } from '../lib/format.js'
import { dedupeCarsById } from '../lib/garageLimits.js'
import { buildCarFromQuery, buildCarSubRoutePath } from './carNav.js'
import { resolvedBackgroundImageUrl } from '../lib/mediaUrl.js'

function lastFinalizedEvent(evts) {
  const list = Array.isArray(evts) ? evts.filter((e) => e && !e.isDraft) : []
  if (!list.length) return null
  return list.reduce((a, b) => {
    const ta = Date.parse(a?.at || '') || 0
    const tb = Date.parse(b?.at || '') || 0
    return tb >= ta ? b : a
  })
}

/** Список авто владельца на `/cars` или `/garage`, с единым `from` для возврата из карточки. */
export function OwnerGarageCarList({ ownerEmail, fromPath = '/cars', cars: carsProp, enrichedRows: enrichedFromParent }) {
  const r = useRepo()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const parentSuppliesEnrichment = enrichedFromParent !== undefined

  const carsKey = useMemo(() => {
    if (carsProp === undefined) return '\0fetch'
    const list = Array.isArray(carsProp) ? carsProp : []
    return list
      .map((c) => String(c?.id ?? ''))
      .sort()
      .join('\n')
  }, [carsProp])

  useEffect(() => {
    if (parentSuppliesEnrichment) return
    let cancelled = false
    ;(async () => {
      if (!ownerEmail) {
        setRows([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        let list
        if (carsProp !== undefined) {
          list = dedupeCarsById(Array.isArray(carsProp) ? carsProp : [])
        } else {
          const cars = await r.listCars()
          list = dedupeCarsById(Array.isArray(cars) ? cars : [])
        }
        const enriched = await Promise.all(
          list.map(async (car) => {
            const evtsRaw = await r.listEvents(car.id)
            const evts = Array.isArray(evtsRaw) ? evtsRaw : []
            return { car, evts }
          }),
        )
        if (!cancelled) setRows(enriched)
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, r, r._version, carsKey, carsProp, parentSuppliesEnrichment])

  const fromQ = buildCarFromQuery(fromPath)

  if (parentSuppliesEnrichment && enrichedFromParent === null) {
    return (
      <div className="muted pageLoadSpinner--centerBlock" style={{ padding: '12px 0', minHeight: 56 }}>
        <PageLoadSpinner size="compact" />
      </div>
    )
  }

  const listRows = parentSuppliesEnrichment ? enrichedFromParent || [] : rows

  if (!parentSuppliesEnrichment && loading) {
    return (
      <div className="muted pageLoadSpinner--centerBlock" style={{ padding: '12px 0', minHeight: 56 }}>
        <PageLoadSpinner size="compact" />
      </div>
    )
  }

  return (
    <div className="list">
      {listRows.map(({ car: c, evts }) => {
        const lastEvt = lastFinalizedEvent(evts)
        const mileageKm = lastEvt != null && lastEvt.mileageKm != null && lastEvt.mileageKm !== '' ? lastEvt.mileageKm : c.mileageKm
        const yearStr = c.year != null && c.year !== '' ? String(c.year) : '—'
        const carHref = `/car/${c.id}${fromQ}`
        const newVisitHref = buildCarSubRoutePath(c.id, 'history', fromPath, { new: '1' })
        return (
          <div key={c.id} className="rowItem">
            <Link
              className="rowItem__rowLink"
              to={carHref}
              aria-hidden="true"
              tabIndex={-1}
            >
              <div
                className="rowItem__img"
                style={c.hero ? { backgroundImage: resolvedBackgroundImageUrl(c.hero) } : undefined}
              />
            </Link>
            <div className="rowItem__ownerGarageMid">
              <Link
                className="rowItem__ownerGarageMainTap"
                to={carHref}
                aria-label={`Открыть карточку: ${c.make} ${c.model}`}
              >
                <div className="rowItem__main">
                  <div className="rowItem__title">
                    {c.make} {c.model}
                  </div>
                  <div className="rowItem__meta carPage__meta">
                    <span>{yearStr}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="eventMeta__km">{fmtKm(mileageKm)}</span>
                  </div>
                </div>
              </Link>
              <Link
                className="btn carPage__recsAddVisitBtn rowItem__garageAddVisit"
                data-variant="outline"
                to={newVisitHref}
                aria-label="Добавить визит"
              >
                Добавить визит
              </Link>
            </div>
            <div className="rowItem__aside rowItem__aside--hint">
              <OpenAction to={carHref} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
