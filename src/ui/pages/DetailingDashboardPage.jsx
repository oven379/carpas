import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useRepo } from '../useRepo.js'
import { Card, Field, Input, Pill } from '../components.jsx'
import { fmtDate, fmtPlateFull, normVin, parsePlateFull } from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'

function normStr(s) {
  return String(s || '').trim().toLowerCase()
}

function onlyDigits(s) {
  return String(s || '').replace(/[^\d]/g, '')
}

function inferPrefill(qRaw) {
  const q = String(qRaw || '').trim()
  const qLower = q.toLowerCase()
  const digits = onlyDigits(q)

  // VIN: чаще всего 17 символов, но в MVP допускаем 11+
  const vinCandidate = normVin(q)
  const isVin = vinCandidate.length >= 11

  // Номер: обычно содержит буквы+цифры, короткий
  const plateCandidate = q.replace(/\s+/g, '')
  const isPlate = /[a-zа-я]/i.test(plateCandidate) && /\d/.test(plateCandidate) && plateCandidate.length <= 12

  const looksLikeEmail = qLower.includes('@') && qLower.includes('.')

  return {
    vin: isVin && !looksLikeEmail ? vinCandidate : '',
    plate: isPlate && !looksLikeEmail ? parsePlateFull(plateCandidate).plate : '',
    plateRegion: isPlate && !looksLikeEmail ? parsePlateFull(plateCandidate).plateRegion : '',
    clientPhone: digits.length >= 10 ? q : '',
    clientEmail: looksLikeEmail ? qLower : '',
  }
}

function isStrictHit(car, qRaw) {
  const q = String(qRaw || '').trim()
  if (!q) return false
  const qLower = normStr(q)
  const qDigits = onlyDigits(q)
  const qVin = normVin(q)
  const vin = normStr(car?.vin)
  const plate = normStr(car?.plate)
  const clientPhoneDigits = onlyDigits(car?.clientPhone)
  const ownerPhoneDigits = onlyDigits(car?.ownerPhone)

  if (qVin && qVin.length >= 11 && qVin === normVin(car?.vin)) return true
  if (vin && qLower === vin) return true
  if (plate && qLower === plate) return true
  if (qDigits && qDigits.length >= 10) {
    if (clientPhoneDigits && clientPhoneDigits.endsWith(qDigits)) return true
    if (ownerPhoneDigits && ownerPhoneDigits.endsWith(qDigits)) return true
  }
  return false
}

function matches(car, q) {
  if (!q) return true
  const s = String(q || '').trim().toLowerCase()
  if (!s) return true
  const digits = s.replace(/[^\d+]/g, '')
  return (
    String(car.vin || '').toLowerCase().includes(s) ||
    String(car.plate || '').toLowerCase().includes(s) ||
    String(car.make || '').toLowerCase().includes(s) ||
    String(car.model || '').toLowerCase().includes(s) ||
    String(car.city || '').toLowerCase().includes(s) ||
    String(car.ownerEmail || '').toLowerCase().includes(s) ||
    String(car.ownerPhone || '').replace(/[^\d+]/g, '').includes(digits) ||
    String(car.clientName || '').toLowerCase().includes(s) ||
    String(car.clientEmail || '').toLowerCase().includes(s) ||
    String(car.clientPhone || '').replace(/[^\d+]/g, '').includes(digits) ||
    String(car.seller?.name || '').toLowerCase().includes(s)
  )
}

export default function DetailingDashboardPage() {
  const r = useRepo()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''

  const { detailingId, mode } = useDetailing()

  const det = useMemo(() => {
    if (!detailingId) return null
    return r.getDetailing?.(detailingId) || null
  }, [r, detailingId])

  const cars = useMemo(() => {
    if (!detailingId) return []
    return r.listCars(detailingId) || []
  }, [r, detailingId])

  const filtered = useMemo(() => cars.filter((c) => matches(c, q)), [cars, q])
  const strictHits = useMemo(() => cars.filter((c) => isStrictHit(c, q)), [cars, q])
  const quickTargetCar = strictHits.length === 1 ? strictHits[0] : null

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (det && det.profileCompleted === false) return <Navigate to="/detailing/settings" replace />

  const initials = String(det?.name || 'Д').trim().slice(0, 2).toUpperCase()
  const addressText = [det?.city, det?.address].filter(Boolean).join(', ')
  const mapsHref = addressText ? `https://yandex.ru/maps/?text=${encodeURIComponent(addressText)}` : ''
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const navHref = addressText ? (isIOS ? `maps://?q=${encodeURIComponent(addressText)}` : `geo:0,0?q=${encodeURIComponent(addressText)}`) : ''
  const phoneDigits = String(det?.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : ''

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Кабинет СТО</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              {det?.name || 'Детейлинг / СТО'}
            </h1>
          </div>
          <p className="muted carPage__meta">
            <span>{det?.city || '—'}</span>
            <span aria-hidden="true"> · </span>
            {addressText ? (
              <a
                href={navHref || mapsHref}
                target={navHref ? undefined : '_blank'}
                rel={navHref ? undefined : 'noreferrer'}
                title="Открыть в навигаторе"
                onClick={(e) => {
                  if (!navHref) return
                  e.preventDefault()
                  try {
                    window.location.href = navHref
                  } catch (err) {
                    console.warn(err)
                  }
                  setTimeout(() => {
                    try {
                      window.open(mapsHref, '_blank', 'noreferrer')
                    } catch (err) {
                      console.warn(err)
                    }
                  }, 450)
                }}
              >
                {det.address || addressText}
              </a>
            ) : (
              <span>—</span>
            )}
            <span aria-hidden="true"> · </span>
            {det?.phone ? (
              <a href={phoneHref} title="Позвонить">
                {det.phone}
              </a>
            ) : (
              <span>—</span>
            )}
          </p>
        </div>
      </div>

      <div
        className="detHero detHero--card"
        style={det?.cover ? { backgroundImage: `url("${String(det.cover).replaceAll('"', '%22')}")` } : undefined}
      >
        <div className="detHero__overlay detHero__overlay--card">
          <Link
            className="btn detHero__editBtn detHero__editBtn--icon"
            data-variant="ghost"
            to="/detailing/settings"
            aria-label="Редактировать компанию"
            title="Редактировать компанию"
          >
            <span className="carPage__icon carPage__icon--edit detHero__editIcon" aria-hidden="true" />
          </Link>

          {det?.logo ? (
            <div className="detHero__logo detHero__logo--card">
              <img alt="Логотип" src={det.logo} />
            </div>
          ) : (
            <div className="detHero__logo detHero__logo--card">
              <span aria-hidden="true">{initials}</span>
            </div>
          )}
          <div className="detHero__bottomRow">
            <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
              <Pill tone="accent">Авто на обслуживании: {cars.length}</Pill>
            </div>
          </div>
        </div>
      </div>

      <Card className="card pad detSearchCard" style={{ marginTop: 12 }}>
        <div className="row gap detSearchCard__row">
          <Input
            className="input detSearchCard__input"
            placeholder="Поиск… (VIN / номер / телефон / почта / марка)"
            value={q}
            onChange={(e) => setSp({ q: e.target.value }, { replace: true })}
          />
          <button
            type="button"
            className="btn detSearchCard__addBtn"
            data-variant="primary"
            onClick={() => {
              const from = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
              if (quickTargetCar) {
                nav(`/car/${quickTargetCar.id}/history?new=1&from=${encodeURIComponent(from)}`)
                return
              }
              const pre = inferPrefill(q)
              const qp = new URLSearchParams()
              if (pre.vin) qp.set('vin', pre.vin)
              if (pre.plate) qp.set('plate', pre.plate)
              if (pre.plateRegion) qp.set('plateRegion', pre.plateRegion)
              if (pre.clientPhone) qp.set('clientPhone', pre.clientPhone)
              if (pre.clientEmail) qp.set('clientEmail', pre.clientEmail)
              const qs = qp.toString()
              nav(`/create${qs ? `?${qs}` : ''}`)
            }}
            title={
              quickTargetCar
                ? 'Открыть создание визита для найденного авто'
                : 'Создать новое авто (VIN/номер/телефон подставятся автоматически)'
            }
          >
            {quickTargetCar ? '+ Визит' : '+ Добавить авто'}
          </button>
        </div>
      </Card>

      <div className="list" style={{ marginTop: 12 }}>
        {filtered.map((c) => {
          const lastVisitAt = r.listEvents(c.id, { detailingId })[0]?.at || null
          return (
            <Link
              key={c.id}
              className="rowItem"
              to={`/car/${c.id}?from=${encodeURIComponent(`/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`)}`}
            >
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
                  <span className="mono" title="Госномер">
                    {fmtPlateFull(c.plate, c.plateRegion) || '—'}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    VIN: <span className="mono">{c.vin || '—'}</span>
                  </span>
                  {lastVisitAt ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{fmtDate(lastVisitAt)}</span>
                    </>
                  ) : null}
                </div>
                <div className="rowItem__sub">
                  Клиент:{' '}
                  {c.clientName || c.clientPhone || c.clientEmail || c.ownerEmail || c.ownerPhone || '—'}
                </div>
              </div>
              <div className="rowItem__aside">
                <button
                  className="btn"
                  data-variant="primary"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const from = `/detailing${q ? `?q=${encodeURIComponent(q)}` : ''}`
                    nav(`/car/${c.id}/history?new=1&from=${encodeURIComponent(from)}`)
                  }}
                  title="Быстро добавить визит"
                >
                  + Визит
                </button>
              </div>
            </Link>
          )
        })}

        {cars.length === 0 ? (
          <Card className="card pad">
            <div className="cardTitle">Пока нет автомобилей</div>
            <p className="muted small" style={{ marginTop: 6 }}>
              Здесь появятся авто, которые вы обслуживаете. Нажмите «Добавить авто», чтобы создать первую карточку клиента.
            </p>
            <div className="row gap" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                data-variant="primary"
                onClick={() => {
                  const pre = inferPrefill(q)
                  const qp = new URLSearchParams()
                  if (pre.vin) qp.set('vin', pre.vin)
                  if (pre.plate) qp.set('plate', pre.plate)
                  if (pre.plateRegion) qp.set('plateRegion', pre.plateRegion)
                  if (pre.clientPhone) qp.set('clientPhone', pre.clientPhone)
                  if (pre.clientEmail) qp.set('clientEmail', pre.clientEmail)
                  const qs = qp.toString()
                  nav(`/create${qs ? `?${qs}` : ''}`)
                }}
              >
                + Добавить авто
              </button>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Ничего не найдено. Попробуйте другой запрос.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

