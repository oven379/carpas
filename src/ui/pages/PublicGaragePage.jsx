import { Link, Navigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useRepo } from '../useRepo.js'
import { BackNav, Card } from '../components.jsx'
import {
  fmtKm,
  fmtPlatePublic,
  fmtVinPublic,
  normalizeHttpUrl,
  ownerCityPublicFlag,
  ownerPublicFlagTrue,
  parseGarageSocialLines,
} from '../../lib/format.js'

export default function PublicGaragePage() {
  const { slug } = useParams()
  const r = useRepo()

  const owner = useMemo(() => {
    const s = String(slug || '').trim()
    if (!s || !r.getOwnerByGarageSlug) return null
    return r.getOwnerByGarageSlug(s)
  }, [slug, r])

  const socialLinks = useMemo(() => {
    if (!ownerPublicFlagTrue(owner?.showSocialPublic)) return []
    return parseGarageSocialLines(owner.garageSocial)
      .map((line) => ({ line, href: normalizeHttpUrl(line) }))
      .filter((x) => x.href)
  }, [owner?.showSocialPublic, owner?.garageSocial])

  if (!slug?.trim()) return <Navigate to="/about" replace />
  if (!owner) return <Navigate to="/about" replace />

  const ownerEmail = owner.email
  const cars = r.listCars({ ownerEmail }) || []
  const displayName = String(owner.name || '').trim() || 'Гараж'
  const showCityPublic = ownerCityPublicFlag(owner.showCityPublic)
  const cityLabel = showCityPublic ? String(owner.garageCity || '').trim() : ''
  const initials = displayName.slice(0, 2).toUpperCase()
  const phoneDigits = String(owner.phone || '').replace(/[^\d+]/g, '')
  const showPhonePublic = ownerPublicFlagTrue(owner.showPhonePublic)
  const phoneHref = showPhonePublic && phoneDigits ? `tel:${phoneDigits}` : ''
  const phoneLabel = showPhonePublic ? String(owner.phone || '').trim() : ''
  const websiteRaw = ownerPublicFlagTrue(owner.showWebsitePublic) ? String(owner.garageWebsite || '').trim() : ''
  const websiteHref = websiteRaw ? normalizeHttpUrl(owner.garageWebsite) : ''
  const websiteLabel = websiteRaw

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
            <BackNav fallbackTo="/about" title="Назад" stateFromKey="from" />
            <h1 className="h1" style={{ margin: 0 }}>
              {displayName}
            </h1>
          </div>
          <p className="muted carPage__meta carPage__meta--emph">
            {cars.length} {cars.length === 1 ? 'автомобиль' : cars.length < 5 ? 'автомобиля' : 'автомобилей'} в гараже
            {cityLabel ? (
              <>
                <span aria-hidden="true"> · </span>
                {cityLabel}
              </>
            ) : null}
            {phoneLabel ? (
              <>
                <span aria-hidden="true"> · </span>
                {phoneHref ? (
                  <a className="publicGarage__textLink" href={phoneHref}>
                    {phoneLabel}
                  </a>
                ) : (
                  phoneLabel
                )}
              </>
            ) : null}
            {websiteHref ? (
              <>
                <span aria-hidden="true"> · </span>
                <a className="publicGarage__textLink" href={websiteHref} target="_blank" rel="noopener noreferrer">
                  {websiteLabel}
                </a>
              </>
            ) : null}
            {socialLinks.map(({ line, href }, i) => (
              <span key={`${i}-${href}`}>
                <span aria-hidden="true"> · </span>
                <a className="publicGarage__textLink" href={href} target="_blank" rel="noopener noreferrer">
                  {line.length > 28 ? `${line.slice(0, 26)}…` : line}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>

      <div
        className={`detHero detHero--card garageHero${owner.garageBanner ? '' : ' garageHero--noBanner'}`}
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
          Автомобили в гараже
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
