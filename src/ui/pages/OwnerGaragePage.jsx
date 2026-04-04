import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, ServiceHint } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import OwnerVinClaimSection from '../OwnerVinClaimSection.jsx'
import { fmtDateTime } from '../../lib/format.js'
import { OWNER_MAX_MANUAL_CARS, OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'

function pickLinkedDetailing(r, ownerEmail, cars) {
  const score = new Map()
  for (const c of cars) {
    const id = String(c.detailingId || '').trim()
    if (!id) continue
    score.set(id, (score.get(id) || 0) + 1)
  }
  if (score.size === 0 && typeof r.listClaimsForOwner === 'function') {
    for (const cl of r.listClaimsForOwner(ownerEmail) || []) {
      const id = String(cl.detailingId || '').trim()
      if (!id) continue
      score.set(id, (score.get(id) || 0) + 1)
    }
  }
  let bestId = ''
  let bestN = 0
  for (const [id, n] of score) {
    if (n > bestN) {
      bestN = n
      bestId = id
    }
  }
  if (!bestId || !r.getDetailing) return null
  return r.getDetailing(bestId)
}

export default function OwnerGaragePage() {
  const r = useRepo()
  const loc = useLocation()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const showSetupBanner = sp.get('from') === 'setup'
  const { owner, mode } = useDetailing()
  const slug = String(owner?.garageSlug || '').trim()
  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug) return ''
    return `${window.location.origin}/g/${slug}`
  }, [slug])

  const [copyHint, setCopyHint] = useState('')
  const copyPublicUrl = useCallback(async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyHint('Ссылка скопирована')
      window.setTimeout(() => setCopyHint(''), 2200)
    } catch {
      setCopyHint('Не удалось скопировать')
      window.setTimeout(() => setCopyHint(''), 2500)
    }
  }, [publicUrl])

  const ownerEmail = owner?.email ? String(owner.email) : ''

  useEffect(() => {
    if (loc.hash !== '#garage-vin-claim') return
    const t = window.setTimeout(() => {
      document.getElementById('garage-vin-claim')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [loc.hash, loc.pathname])

  const activityAt = useMemo(() => {
    const o = owner
    if (!o?.email) return ''
    const a = o.lastVisitAt || o.createdAt || ''
    const b = o.updatedAt || o.createdAt || ''
    const ta = Date.parse(a) || 0
    const tb = Date.parse(b) || 0
    return ta >= tb ? a : b
  }, [owner])
  const activityLabel = useMemo(() => {
    const o = owner
    if (!o?.email) return ''
    const a = o.lastVisitAt || o.createdAt || ''
    const b = o.updatedAt || o.createdAt || ''
    const ta = Date.parse(a) || 0
    const tb = Date.parse(b) || 0
    return ta >= tb ? 'Последний визит' : 'Профиль обновлён'
  }, [owner])

  const visitPinged = useRef(false)
  useEffect(() => {
    visitPinged.current = false
  }, [ownerEmail])

  useEffect(() => {
    if (visitPinged.current || !ownerEmail || mode !== 'owner' || !r.touchOwnerLastVisit) return
    visitPinged.current = true
    const next = r.touchOwnerLastVisit(ownerEmail)
    if (next) invalidateRepo()
  }, [ownerEmail, r, mode])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (mode !== 'owner' || !owner?.email) return <Navigate to="/auth/owner" replace />

  const cars = r.listCars({ ownerEmail })
  const limits = ownerGarageLimits(cars)
  const linkedDetailing = pickLinkedDetailing(r, ownerEmail, cars)
  const detInitials = String(linkedDetailing?.name || 'Д')
    .trim()
    .slice(0, 2)
    .toUpperCase()
  const displayName = String(owner.name || '').trim() || ownerEmail
  const initials = displayName.slice(0, 2).toUpperCase()
  const cityLine = String(owner.garageCity || '').trim()
  const phoneStr = String(owner.phone || '').trim()

  return (
    <div className="container garagePage">
      {showSetupBanner ? (
        <Card className="card pad detPublicSetupBanner" style={{ marginBottom: 12 }}>
          <div className="row spread gap wrap" style={{ alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Настройки гаража сохранены
              </div>
              <p className="muted small" style={{ margin: '8px 0 0', maxWidth: '58ch', lineHeight: 1.5 }}>
                На публичной витрине по ссылке <span className="mono">/g/…</span> отображаются имя, число авто и поля, для которых вы
                включили публикацию (город, телефон, сайт, соцсеть).
              </p>
            </div>
            <div className="row gap wrap detPublicSetupBanner__actions">
              <Link className="btn" data-variant="primary" to="/create">
                Добавить автомобиль
              </Link>
              <Link className="btn" data-variant="outline" to="/garage/settings">
                Изменить витрину
              </Link>
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={() => nav('/garage', { replace: true })}
              >
                Скрыть
              </button>
            </div>
          </div>
        </Card>
      ) : null}
      <div
        className={`detHero detHero--card garageHero${owner.garageBanner ? '' : ' garageHero--noBanner'}`}
        style={
          owner.garageBanner
            ? { backgroundImage: `url("${String(owner.garageBanner).replaceAll('"', '%22')}")` }
            : undefined
        }
      >
        <div className="detHero__overlay detHero__overlay--card detHero__overlay--garageOwner">
          <Link
            className="btn detHero__editBtn detHero__editBtn--icon"
            data-variant="ghost"
            to="/garage/settings"
            aria-label="Настройки гаража: баннер, аватар, контакты, адрес страницы"
            title="Настройки гаража"
          >
            <span className="carPage__icon carPage__icon--edit detHero__editIcon" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Card className="card pad garageProfileCard" style={{ marginTop: 12, marginBottom: 16 }}>
        <div className="garageProfileCard__top">
          <div className="garageProfileCard__main">
            <div id="owner-garage-public-hint" className="row gap wrap" style={{ alignItems: 'center' }}>
              <h1 className="garageProfileCard__h1" style={{ margin: 0 }}>
                Гараж
              </h1>
              {publicUrl ? (
                <ServiceHint scopeId="owner-garage-public-hint" variant="compact" label="Справка: публичная ссылка">
                  <p className="serviceHint__panelText">Нажмите на своё имя ниже, чтобы скопировать ссылку на витрину гостям.</p>
                </ServiceHint>
              ) : null}
            </div>
          {publicUrl ? (
            <button
              type="button"
              className="h2 garageProfileCard__nameAction"
              onClick={() => copyPublicUrl()}
              title={`Скопировать ссылку: ${publicUrl}`}
              aria-label="Скопировать ссылку на публичную витрину"
            >
              {displayName}
            </button>
          ) : (
            <h2 className="h2 garageProfileCard__name">{displayName}</h2>
          )}
          {copyHint ? (
            <p className="muted small garageProfileCard__copyStatus" role="status">
              {copyHint}
            </p>
          ) : null}
          <div className="garageProfileCard__meta">
            <p className="muted small garageProfileCard__metaLine">
              <span className="garageProfileCard__metaKey">Город:</span>{' '}
              {cityLine || (
                <>
                  не указан —{' '}
                  <Link className="link" to="/garage/settings">
                    настройки
                  </Link>
                </>
              )}
            </p>
            <p className="muted small garageProfileCard__metaLine">
              <span className="garageProfileCard__metaKey">Телефон:</span>{' '}
              {phoneStr ? (
                phoneStr
              ) : (
                <>
                  не указан —{' '}
                  <Link className="link" to="/garage/settings">
                    настройки
                  </Link>
                </>
              )}
            </p>
            <p className="muted small garageProfileCard__metaLine">
              <span className="garageProfileCard__metaKey">{activityLabel}:</span>{' '}
              {fmtDateTime(activityAt) || '—'}
            </p>
          </div>
          {!publicUrl ? (
            <>
              <p className="muted small garageProfileCard__lead">
                Задайте короткий адрес витрины в настройках — появится ссылка для гостей (латиница, цифры, дефис).
              </p>
              <div className="row gap wrap garageProfileCard__actions">
                <Link className="btn" data-variant="primary" to="/garage/settings">
                  Настройки гаража
                </Link>
              </div>
            </>
          ) : null}
          </div>
          <div className="garageProfileCard__avatarCol" aria-hidden="true">
            {owner.garageAvatar ? (
              <div className="garageProfileCard__avatar">
                <img alt="" src={owner.garageAvatar} />
              </div>
            ) : (
              <div className="garageProfileCard__avatar garageProfileCard__avatar--fallback">{initials}</div>
            )}
          </div>
        </div>
        <div className="garageProfileCard__footer">
          {linkedDetailing ? (
            <Link
              className="garageProfileCard__detAvatar"
              to={`/d/${encodeURIComponent(String(linkedDetailing.id))}`}
              title={String(linkedDetailing.name || '').trim() || 'Страница сервиса'}
              aria-label={
                String(linkedDetailing.name || '').trim()
                  ? `Публичная страница сервиса: ${String(linkedDetailing.name).trim()}`
                  : 'Публичная страница сервиса'
              }
            >
              {linkedDetailing.logo ? (
                <img alt="" src={linkedDetailing.logo} />
              ) : (
                <span className="garageProfileCard__detAvatarFallback" aria-hidden="true">
                  {detInitials}
                </span>
              )}
            </Link>
          ) : null}
          <div className="garageProfileCard__footerActions">
            {limits.canVinClaim ? (
              <Link
                className="btn garageVinClaimBtn"
                data-variant="outline"
                to="/garage#garage-vin-claim"
                aria-label="Найти авто по VIN"
              >
                <span className="garageVinClaimBtn__full">Найти авто по VIN</span>
                <span className="garageVinClaimBtn__short" aria-hidden="true">
                  VIN
                </span>
              </Link>
            ) : (
              <span
                className="btn btn--asDisabled garageVinClaimBtn"
                data-variant="outline"
                title={`В гараже не больше ${OWNER_MAX_TOTAL_CARS} автомобилей`}
                aria-label="Найти авто по VIN"
              >
                <span className="garageVinClaimBtn__full">Найти авто по VIN</span>
                <span className="garageVinClaimBtn__short" aria-hidden="true">
                  VIN
                </span>
              </span>
            )}
            {limits.canAddManual ? (
              <Link
                className="btn garageProfileCard__addCarBtn garageAddCarBtn"
                data-variant="primary"
                to="/create"
                aria-label="Добавить автомобиль"
              >
                <span className="garageAddCarBtn__text">Добавить автомобиль</span>
                <span className="garageAddCarBtn__icon" aria-hidden="true">
                  <span className="carPage__icon carPage__icon--car" />
                </span>
              </Link>
            ) : (
              <span
                className="btn garageProfileCard__addCarBtn garageAddCarBtn btn--asDisabled"
                data-variant="primary"
                title={
                  limits.totalCount >= OWNER_MAX_TOTAL_CARS
                    ? `Не больше ${OWNER_MAX_TOTAL_CARS} авто в гараже`
                    : `Вручную не больше ${OWNER_MAX_MANUAL_CARS} авто — остальное через «Найти авто по VIN» в сервисе`
                }
                aria-label="Добавить автомобиль"
              >
                <span className="garageAddCarBtn__text">Добавить автомобиль</span>
                <span className="garageAddCarBtn__icon" aria-hidden="true">
                  <span className="carPage__icon carPage__icon--car" />
                </span>
              </span>
            )}
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {cars.length ? (
          <>
            <h2 className="h2" style={{ marginBottom: 10 }}>
              Автомобили в гараже
            </h2>
            <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/garage" />
            <OwnerVinClaimSection
              ownerEmail={ownerEmail}
              sectionId="garage-vin-claim"
              style={{ marginTop: 16 }}
            />
          </>
        ) : (
          <OwnerVinClaimSection ownerEmail={ownerEmail} sectionId="garage-vin-claim" />
        )}
      </div>
    </div>
  )
}
