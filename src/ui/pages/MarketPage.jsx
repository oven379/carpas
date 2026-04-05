import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useRepo } from '../useRepo.js'
import {
  dedupeCarsById,
  OWNER_MAX_MANUAL_CARS,
  OWNER_MAX_TOTAL_CARS,
  ownerGarageLimits,
} from '../../lib/garageLimits.js'
import { Pill, ServiceHint } from '../components.jsx'
import { getSessionOwner, hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerVinClaimSection from '../OwnerVinClaimSection.jsx'

export default function MarketPage() {
  const r = useRepo()
  const loc = useLocation()
  const { owner, mode } = useDetailing()
  const ownerEmail = String(owner?.email || getSessionOwner()?.email || '').trim()
  const [cars, setCars] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])

  useEffect(() => {
    if (loc.hash !== '#owner-vin-claim') return
    const t = window.setTimeout(() => {
      document.getElementById('owner-vin-claim')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [loc.hash, loc.pathname])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasOwnerSession()) {
        setCars([])
        setOwnerClaims([])
        return
      }
      try {
        const [cl, claims] = await Promise.all([r.listCars(), r.listClaimsForOwner()])
        if (cancelled) return
        setCars(dedupeCarsById(Array.isArray(cl) ? cl : []))
        setOwnerClaims(Array.isArray(claims) ? claims : [])
      } catch {
        if (!cancelled) {
          setCars([])
          setOwnerClaims([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, ownerEmail])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />

  const limits = ownerGarageLimits(cars)

  return (
    <div className="container">
      <div className="row spread gap">
        <div className="marketHead">
          <div className="marketHead__titleRow">
            <div id="market-cars-hint" className="row gap wrap" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <h1 className="h1" style={{ margin: 0 }}>
                Мои автомобили
              </h1>
              <ServiceHint scopeId="market-cars-hint" variant="compact" label="Справка: список авто">
                <p className="serviceHint__panelText">
                  Здесь карточки и история по каждой машине. Профиль, баннер и публичная улица по ссылке <span className="mono">/g/…</span>{' '}
                  — в разделе «Гараж». Кнопка «Добавить авто» может быть недоступна при лимите гаража.
                </p>
              </ServiceHint>
            </div>
            <div className="marketHead__actions row gap wrap">
              <Link className="btn" data-variant="ghost" to="/garage">
                В гараж
              </Link>
              {limits.canAddManual ? (
                <Link className="btn" data-variant="primary" to="/create">
                  + Добавить авто
                </Link>
              ) : (
                <span
                  className="btn btn--asDisabled"
                  data-variant="primary"
                  title={
                    limits.totalCount >= OWNER_MAX_TOTAL_CARS
                      ? `Не больше ${OWNER_MAX_TOTAL_CARS} авто в гараже`
                      : `Вручную не больше ${OWNER_MAX_MANUAL_CARS} авто`
                  }
                >
                  + Добавить авто
                </span>
              )}
            </div>
          </div>
          <div className="muted" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span>Карточки, история визитов, заявка по VIN</span>
            <span aria-hidden="true"> · </span>
            <span>{cars.length} авто</span>
            {owner?.isPremium ? <Pill tone="accent">Premium</Pill> : null}
          </div>
        </div>
      </div>

      <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/cars" />

      <OwnerVinClaimSection
        ownerEmail={ownerEmail}
        sectionId="owner-vin-claim"
        cars={cars}
        ownerClaims={ownerClaims}
        evidenceMode="full"
        style={{ marginTop: 12 }}
      />
    </div>
  )
}
