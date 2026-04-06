import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRepo } from './useRepo.js'
import { OpenAction, PageLoadSpinner } from './components.jsx'
import { fmtKm } from '../lib/format.js'
import { dedupeCarsById } from '../lib/garageLimits.js'
import { buildCarFromQuery } from './carNav.js'
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
export function OwnerGarageCarList({ ownerEmail, fromPath = '/cars', cars: carsProp }) {
  const r = useRepo()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const carsKey = useMemo(() => {
    if (carsProp === undefined) return '\0fetch'
    const list = Array.isArray(carsProp) ? carsProp : []
    return list
      .map((c) => String(c?.id ?? ''))
      .sort()
      .join('\n')
  }, [carsProp])

  useEffect(() => {
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
  }, [ownerEmail, r, r._version, carsKey, carsProp])

  const fromQ = buildCarFromQuery(fromPath)

  if (loading) {
    return (
      <div className="muted pageLoadSpinner--centerBlock" style={{ padding: '12px 0', minHeight: 56 }}>
        <PageLoadSpinner size="compact" />
      </div>
    )
  }

  return (
    <div className="list">
      {rows.map(({ car: c, evts }) => {
        const lastEvt = lastFinalizedEvent(evts)
        const mileageKm = lastEvt != null && lastEvt.mileageKm != null && lastEvt.mileageKm !== '' ? lastEvt.mileageKm : c.mileageKm
        const yearStr = c.year != null && c.year !== '' ? String(c.year) : '—'
        return (
          <Link key={c.id} className="rowItem" to={`/car/${c.id}${fromQ}`}>
            <div
              className="rowItem__img"
              style={c.hero ? { backgroundImage: resolvedBackgroundImageUrl(c.hero) } : undefined}
            />
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
            <div className="rowItem__aside rowItem__aside--hint">
              <OpenAction asSpan />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
