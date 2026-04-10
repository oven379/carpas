import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useRepo } from '../useRepo.js'
import { dedupeCarsById, OWNER_MAX_FREE_GARAGE_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'
import { HeroCoverStat, PageLoadSpinner, Pill, ServiceHint } from '../components.jsx'
import { SupportButton } from '../support/SupportHub.jsx'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../../lib/supportTicketPresets.js'
import { hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerVinClaimSection from '../OwnerVinClaimSection.jsx'

export default function MarketPage() {
  const r = useRepo()
  const loc = useLocation()
  const { owner, mode, loading } = useDetailing()
  const ownerEmail = String(owner?.email || '').trim()
  const [cars, setCars] = useState([])
  const [ownerClaims, setOwnerClaims] = useState([])
  const [listBusy, setListBusy] = useState(true)

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
        setListBusy(false)
        return
      }
      setListBusy(true)
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
      } finally {
        if (!cancelled) setListBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, ownerEmail])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />
  if (mode === 'owner' && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!ownerEmail) return <Navigate to="/auth/owner" replace />
  if (listBusy) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  const limits = ownerGarageLimits(cars, { isPremium: Boolean(owner?.isPremium) })

  return (
    <div className="container">
      <div className="row spread gap">
        <div className="marketHead">
          <div className="marketHead__titleRow">
            <div id="market-cars-hint" className="row gap wrap" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <h1 className="h1" style={{ margin: 0 }}>
                Мой гараж
              </h1>
              <ServiceHint scopeId="market-cars-hint" variant="compact" label="Справка: список авто">
                <p className="serviceHint__panelText">
                  Здесь карточки и история по каждой машине. Профиль, баннер и витрина по ссылке <span className="mono">/g/…</span> — в
                  разделе «Гараж». Бесплатно — до {OWNER_MAX_FREE_GARAGE_CARS} авто в гараже; лимит не распространяется на кабинет
                  партнёра: детейлинг может вести любое число карточек у себя.
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
                <SupportButton
                  type="button"
                  className="btn"
                  data-variant="primary"
                  title={`Уже ${OWNER_MAX_FREE_GARAGE_CARS} авто на бесплатном тарифе — заявка на Premium`}
                  openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}
                >
                  + Добавить авто
                </SupportButton>
              )}
            </div>
            {!limits.canAddManual ? (
              <p className="muted small" style={{ marginTop: 10, lineHeight: 1.55, maxWidth: '64ch' }}>
                В личном гараже бесплатно — до {OWNER_MAX_FREE_GARAGE_CARS} автомобилей. Нажмите «+ Добавить авто», чтобы отправить
                заявку на Premium и расширить гараж. У детейлинга в его кабинете ограничений на число карточек клиентов нет.
              </p>
            ) : null}
          </div>
          <div className="muted" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <span>Карточки, история визитов, заявка по VIN</span>
            <span aria-hidden="true"> · </span>
            <HeroCoverStat
              kind="car"
              variant="card"
              layout="inline"
              value={cars.length}
              label="авто"
              title={`${cars.length} ${cars.length === 1 ? 'автомобиль' : cars.length < 5 ? 'автомобиля' : 'автомобилей'} в списке`}
            />
            {owner?.isPremium ? <Pill tone="accent">Premium</Pill> : null}
          </div>
        </div>
      </div>

      <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/cars" cars={cars} />

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
