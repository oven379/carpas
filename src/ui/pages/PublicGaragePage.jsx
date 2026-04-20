import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { BackNav, Card, PageLoadSpinner } from '../components.jsx'
import {
  displayRuPhone,
  fmtKm,
  fmtPlatePublic,
  fmtVinPublic,
  normalizeHttpUrl,
  parseGarageSocialLines,
} from '../../lib/format.js'
import { absoluteUrl } from '../../lib/siteOrigin.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { isGarageBannerImageVisible } from '../../lib/garageBanner.js'
import { Seo } from '../../seo/Seo.jsx'
import { truncateMetaDescription } from '../../seo/seoUtils.js'

function mediaUrlToOgImage(url) {
  const u = resolvePublicMediaUrl(url)
  if (!u) return undefined
  if (/^https?:\/\//i.test(u)) return u
  return absoluteUrl(u.startsWith('/') ? u : `/${u}`)
}

export default function PublicGaragePage() {
  const { slug } = useParams()
  const nav = useNavigate()
  const r = useRepo()
  const [data, setData] = useState(undefined)

  const slugNorm = useMemo(() => String(slug || '').trim(), [slug])
  const ownerPreview = data?.owner
  const socialLinks = useMemo(() => {
    if (!ownerPreview || data?.garagePrivate) return []
    return parseGarageSocialLines(ownerPreview.garageSocial || '')
      .map((line) => ({ line, href: normalizeHttpUrl(line) }))
      .filter((x) => x.href)
  }, [ownerPreview, data?.garagePrivate])

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

  if (!slugNorm) return <Navigate to="/" replace />

  if (data === undefined) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <Seo
          title="Публичный гараж · КарПас"
          description="Публичная витрина гаража в сервисе КарПас: список автомобилей по настройкам владельца."
          canonicalPath={`/g/${slugNorm}`}
        />
        <PageLoadSpinner />
      </div>
    )
  }
  if (!data?.owner) return <Navigate to="/" replace />

  if (data.garagePrivate) {
    return (
      <div className="container" style={{ padding: '40px 16px 48px' }}>
        <Seo
          title="Гараж недоступен · КарПас"
          description="Публичная витрина гаража отключена владельцем."
          canonicalPath={`/g/${slugNorm}`}
          noindex
        />
        <div className="breadcrumbs" style={{ marginBottom: 16 }}>
          <Link to="/">Главная</Link>
          <span> / </span>
          <span>Гараж владельца</span>
        </div>
        <Card className="card pad" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <h1 className="h2" style={{ margin: 0 }}>
            Гараж закрыт
          </h1>
          <p style={{ margin: '18px 0 0', lineHeight: 1.55 }}>
            Пользователь занят в своём гараже.
          </p>
          <p className="muted small" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>
            Публичная витрина отключена: контакты и автомобили по ссылке не показываются. Связь возможна через сервисы, с
            которыми у владельца есть общая история обслуживания.
          </p>
          <div className="row gap wrap" style={{ marginTop: 22, justifyContent: 'center' }}>
            <button type="button" className="btn" data-variant="primary" onClick={() => nav(-1)}>
              Понял!
            </button>
            <Link className="btn" data-variant="ghost" to="/">
              На главную
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const owner = data.owner
  const cars = Array.isArray(data.cars) ? data.cars : []
  const displayName = String(owner.name || '').trim() || 'Гараж'
  const cityLabel = String(owner.garageCity || '').trim()
  const { display: phoneDisplay, telHref: phoneTelHref } = displayRuPhone(owner.phone)
  const websiteRaw = String(owner.garageWebsite || '').trim()
  const websiteHref = websiteRaw ? normalizeHttpUrl(owner.garageWebsite) : ''
  const websiteLabel = websiteRaw
  const bannerSurfaceVisible = isGarageBannerImageVisible(owner)

  const metaParts = []
  if (cityLabel) metaParts.push({ key: 'city', el: cityLabel })
  if (phoneDisplay) {
    metaParts.push({
      key: 'phone',
      el: phoneTelHref ? (
        <a className="publicGarage__textLink" href={phoneTelHref}>
          {phoneDisplay}
        </a>
      ) : (
        phoneDisplay
      ),
    })
  }
  if (websiteHref) {
    metaParts.push({
      key: 'web',
      el: (
        <a className="publicGarage__textLink" href={websiteHref} target="_blank" rel="noopener noreferrer">
          {websiteLabel}
        </a>
      ),
    })
  }
  socialLinks.forEach(({ line, href }, i) => {
    metaParts.push({
      key: `soc-${i}-${href}`,
      el: (
        <a className="publicGarage__textLink" href={href} target="_blank" rel="noopener noreferrer">
          {line.length > 28 ? `${line.slice(0, 26)}…` : line}
        </a>
      ),
    })
  })

  const seoTitle = `${displayName} — публичный гараж${cityLabel ? `, ${cityLabel}` : ''} · КарПас`
  const seoDesc = truncateMetaDescription(
    `Публичная витрина гаража в КарПас: автомобили по настройкам владельца.${cityLabel ? ` ${cityLabel}.` : ''} Личные документы из кабинета сами по себе не публикуются.`,
  )
  const canonicalPath = `/g/${slugNorm}`
  const ogImage = bannerSurfaceVisible
    ? mediaUrlToOgImage(owner.garageBanner)
    : mediaUrlToOgImage(owner.garageAvatar)

  return (
    <div className="container">
      <Seo title={seoTitle} description={seoDesc} canonicalPath={canonicalPath} ogImage={ogImage} />
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/">Главная</Link>
            <span> / </span>
            <span>Гараж владельца</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/" title="Назад" stateFromKey="from" />
            <h1 className="h1" style={{ margin: 0 }}>
              {displayName}
            </h1>
          </div>
          {metaParts.length ? (
            <p className="muted carPage__meta carPage__meta--emph">
              {metaParts.map((p, i) => (
                <span key={p.key}>
                  {i > 0 ? <span aria-hidden="true"> · </span> : null}
                  {p.el}
                </span>
              ))}
            </p>
          ) : (
            <p className="muted small carPage__meta">Публичные контакты не указаны — список автомобилей ниже.</p>
          )}
        </div>
      </div>

      <div
        className={`detHero detHero--card garageHero${bannerSurfaceVisible ? '' : ' garageHero--noBanner'}`}
        style={
          bannerSurfaceVisible ? { backgroundImage: resolvedBackgroundImageUrl(owner.garageBanner) } : undefined
        }
      >
        <div className="detHero__overlay detHero__overlay--card detHero__overlay--bannerMetrics">
          <div className="detHero__logo detHero__logo--card">
            {owner.garageAvatar ? (
              <img alt="" src={resolvePublicMediaUrl(owner.garageAvatar)} />
            ) : (
              <DefaultAvatar fallback={displayName} alt="" />
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Автомобили в гараже:
        </h2>
        {cars.length ? (
          <div className="list">
            {cars.map((c) => (
              <div key={c.id} className="rowItem rowItem--static" aria-label={`${c.make} ${c.model}`}>
                <div
                  className="rowItem__img"
                  style={c.hero ? { backgroundImage: resolvedBackgroundImageUrl(c.hero) } : undefined}
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
            <div className="muted">В этом гараже пока нет автомобилей на улице.</div>
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
          <Link className="btn" data-variant="ghost" to="/">
            На главную
          </Link>
        </div>
      </Card>
    </div>
  )
}
