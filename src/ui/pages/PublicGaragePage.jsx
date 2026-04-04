import { Link, Navigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { Card } from '../components.jsx'
import { fmtKm, fmtPlatePublic, fmtVinPublic } from '../../lib/format.js'

export default function PublicGaragePage() {
  const { slug } = useParams()
  const r = useRepo()
  const [data, setData] = useState(undefined)

  const slugNorm = useMemo(() => String(slug || '').trim(), [slug])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!slugNorm) {
        setData(null)
        return
      }
      try {
        const res = await r.publicGarage(slugNorm)
        if (!cancelled) setData(res || null)
      } catch {
        if (!cancelled) setData(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slugNorm, r, r._version])

  if (!slugNorm) return <Navigate to="/about" replace />

  if (data === undefined) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!data?.owner) return <Navigate to="/about" replace />

  const owner = data.owner
  const cars = Array.isArray(data.cars) ? data.cars : []
  const displayName = String(owner.name || '').trim() || 'Гараж'
  const initials = displayName.slice(0, 2).toUpperCase()
  const phoneDigits = String(owner.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = owner.showPhonePublic && phoneDigits ? `tel:${phoneDigits}` : ''
  const phoneLabel = owner.showPhonePublic ? String(owner.phone || '').trim() : ''

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/about">О сервисе</Link>
            <span> / </span>
            <span>Гараж владельца</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <h1 className="h1" style={{ margin: 0 }}>
              {displayName}
            </h1>
          </div>
          <p className="muted carPage__meta carPage__meta--emph">
            {cars.length} {cars.length === 1 ? 'автомобиль' : cars.length < 5 ? 'автомобиля' : 'автомобилей'} в гараже
            {phoneLabel ? (
              <>
                <span aria-hidden="true"> · </span>
                {phoneHref ? (
                  <a className="link" href={phoneHref}>
                    {phoneLabel}
                  </a>
                ) : (
                  phoneLabel
                )}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div
        className="detHero detHero--card garageHero"
        style={
          owner.garageBanner
            ? { backgroundImage: `url("${String(owner.garageBanner).replaceAll('"', '%22')}")` }
            : undefined
        }
      >
        <div className="detHero__overlay detHero__overlay--card">
          {owner.garageAvatar ? (
            <div className="detHero__logo detHero__logo--card">
              <img alt="" src={owner.garageAvatar} />
            </div>
          ) : (
            <div className="detHero__logo detHero__logo--card garageHero__avatarFallback" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Автомобили
        </h2>
        {cars.length ? (
          <div className="list">
            {cars.map((c) => (
              <div key={c.id} className="rowItem rowItem--static" aria-label={`${c.make} ${c.model}`}>
                <div
                  className="rowItem__img"
                  style={c.hero ? { backgroundImage: `url("${String(c.hero).replaceAll('"', '%22')}")` } : undefined}
                />
                <div className="rowItem__main">
                  <div className="rowItem__title">
                    {c.make} {c.model}
                  </div>
                  <div className="rowItem__meta carPage__meta">
                    <span>{c.city || '—'}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="mono" title="Госномер (частично скрыт)">
                      {fmtPlatePublic(c.plate, c.plateRegion)}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>
                      VIN: <span className="mono">{fmtVinPublic(c.vin)}</span>
                    </span>
                  </div>
                  <div className="rowItem__sub">
                    <div className="muted small">
                      {`Цвет: ${c.color || '—'} · Год: ${c.year != null && c.year !== '' ? c.year : '—'} · Пробег: ${fmtKm(c.mileageKm)}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="card pad">
            <div className="muted">В этом гараже пока нет автомобилей на витрине.</div>
          </Card>
        )}
      </div>

      <Card className="card pad" style={{ marginTop: 16 }}>
        <p className="muted small" style={{ margin: 0 }}>
          Карточки и история обслуживания доступны владельцу после входа в КарПас.
        </p>
        <div className="row gap wrap" style={{ marginTop: 12 }}>
          <Link className="btn" data-variant="primary" to="/auth/owner">
            Войти как владелец
          </Link>
          <Link className="btn" data-variant="ghost" to="/about">
            О сервисе
          </Link>
        </div>
      </Card>
    </div>
  )
}
