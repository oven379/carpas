import { Link, Navigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Card, Pill } from '../components.jsx'
import { bumpSessionRefresh, getSessionOwner, hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { OwnerGarageCarList } from '../OwnerGarageCarList.jsx'
import { compressImageFile } from '../../lib/imageCompression.js'
import { OWNER_MAX_MANUAL_CARS, OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'

export default function OwnerGaragePage() {
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const [cars, setCars] = useState([])
  const bannerFileRef = useRef(null)
  const slug = String(owner?.garageSlug || '').trim()
  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug) return ''
    return `${window.location.origin}/g/${slug}`
  }, [slug])

  const ownerEmail = String(owner?.email || getSessionOwner()?.email || '').trim()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasOwnerSession() || !ownerEmail) {
        setCars([])
        return
      }
      try {
        const cl = await r.listCars()
        if (!cancelled) setCars(Array.isArray(cl) ? cl : [])
      } catch {
        if (!cancelled) setCars([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmail, r, r._version])

  const limits = useMemo(() => ownerGarageLimits(cars), [cars])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />

  const displayName = String(owner?.name || getSessionOwner()?.name || '').trim() || ownerEmail
  const initials = displayName.slice(0, 2).toUpperCase()

  async function onBannerFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await compressImageFile(file, {
        maxW: 2000,
        maxH: 1200,
        quality: 0.82,
        maxBytes: 2.5 * 1024 * 1024,
      })
      if (!url) return
      try {
        await r.updateOwnerMe({ garageBanner: url })
        invalidateRepo()
        bumpSessionRefresh()
      } catch {
        alert('Не удалось сохранить баннер.')
      }
    } catch {
      alert('Не удалось обработать файл. Попробуйте другое изображение.')
    }
  }

  async function removeBanner() {
    if (!owner?.garageBanner) return
    if (!confirm('Убрать баннер гаража?')) return
    try {
      await r.updateOwnerMe({ garageBanner: '' })
      invalidateRepo()
      bumpSessionRefresh()
    } catch {
      alert('Не удалось убрать баннер.')
    }
  }

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <h1 className="h1" style={{ margin: 0 }}>
            Мой гараж
          </h1>
          <p className="garagePage__ownerName">{displayName}</p>
          <p className="muted carPage__meta garagePage__meta">
            {cars.length} авто
            {owner?.isPremium ? (
              <>
                {' '}
                <Pill tone="accent">Premium</Pill>
              </>
            ) : null}
            {!owner?.isPremium && cars.length > 0 ? (
              <>
                {' '}
                <span className="muted small">
                  (вручную до {OWNER_MAX_MANUAL_CARS}, всего до {OWNER_MAX_TOTAL_CARS}; сверх лимита — через поиск по VIN)
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="row gap wrap" style={{ justifyContent: 'flex-end' }}>
          <Link
            className="btn"
            data-variant="primary"
            to="/create"
            onClick={(e) => {
              if (!limits.canAddManual) {
                e.preventDefault()
                alert(
                  `Лимит гаража: вручную не больше ${OWNER_MAX_MANUAL_CARS} авто, всего не больше ${OWNER_MAX_TOTAL_CARS}. Добавьте авто через поиск по VIN в разделе «Автомобили».`,
                )
              }
            }}
          >
            + Добавить авто
          </Link>
        </div>
      </div>

      <div
        className={`detHero detHero--card garageHero${owner?.garageBanner ? '' : ' garageHero--noBanner'}`}
        style={
          owner?.garageBanner
            ? { backgroundImage: `url("${String(owner.garageBanner).replaceAll('"', '%22')}")` }
            : undefined
        }
      >
        <div className="detHero__overlay detHero__overlay--card detHero__overlay--garageOwner">
          <input
            ref={bannerFileRef}
            type="file"
            accept="image/*"
            className="srOnly"
            onChange={onBannerFileChange}
          />
          <Link
            className="btn detHero__editBtn detHero__editBtn--icon"
            data-variant="ghost"
            to="/garage/settings"
            aria-label="Настройки гаража: имя, телефон, аватар, адрес страницы"
            title="Настройки гаража"
          >
            <span className="carPage__icon carPage__icon--edit detHero__editIcon" aria-hidden="true" />
          </Link>
          {owner?.garageAvatar ? (
            <div className="detHero__logo detHero__logo--card">
              <img alt="" src={owner.garageAvatar} />
            </div>
          ) : (
            <div className="detHero__logo detHero__logo--card garageHero__avatarFallback" aria-hidden="true">
              {initials}
            </div>
          )}
          <div className="detHero__bottomRow garageHero__bottomRow">
            <div className="carHero__editCoverBtns garageHero__bannerBtns">
              <button
                type="button"
                className="heroCoverBtn heroCoverBtn--replace"
                onClick={() => bannerFileRef.current?.click?.()}
              >
                {owner?.garageBanner ? 'Заменить баннер' : 'Загрузить баннер'}
              </button>
              {owner?.garageBanner ? (
                <button type="button" className="heroCoverBtn heroCoverBtn--remove" onClick={removeBanner}>
                  Убрать баннер
                </button>
              ) : null}
            </div>
            <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
              <Pill tone="accent">Авто в гараже: {cars.length}</Pill>
              {slug ? <Pill>Публичная страница: /g/{slug}</Pill> : <Pill>Задайте адрес в настройках</Pill>}
            </div>
          </div>
        </div>
      </div>

      {slug && publicUrl ? (
        <Card className="card pad" style={{ marginTop: 12 }}>
          <div className="cardTitle" style={{ marginBottom: 6 }}>
            Ссылка на гараж
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Показывайте коллекцию без входа в кабинет (без VIN и номеров в полном виде).
          </p>
          <div className="row gap wrap" style={{ marginTop: 10, alignItems: 'center' }}>
            <a className="link" href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
            <button
              type="button"
              className="btn"
              data-variant="outline"
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText?.(publicUrl)
                } catch {
                  /* ignore */
                }
              }}
            >
              Копировать
            </button>
            <Link className="btn" data-variant="ghost" to={`/g/${slug}`} target="_blank" rel="noreferrer">
              Открыть
            </Link>
          </div>
        </Card>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Автомобили
        </h2>
        {cars.length ? (
          <OwnerGarageCarList ownerEmail={ownerEmail} fromPath="/garage" />
        ) : (
          <Card className="card pad">
            <div className="muted">Пока нет авто. Добавьте первое или найдите по VIN на странице «Поиск по VIN».</div>
            <div className="row gap wrap" style={{ marginTop: 12 }}>
              <Link className="btn" data-variant="primary" to="/create">
                + Добавить авто
              </Link>
              <Link className="btn" data-variant="ghost" to="/cars">
                К поиску по VIN
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
