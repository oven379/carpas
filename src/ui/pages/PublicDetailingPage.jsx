import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { BackNav, Card, Pill, ServiceHint } from '../components.jsx'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { urlsToPhotoItems } from '../../lib/photoGallery.js'
import { PHOTO_LANDSCAPE_HINT_SENTENCE } from '../../lib/historyVisitHints.js'
import {
  detailingNavGeocodeQuery,
  detailingYandexMapsWebHref,
  isWholeLineYandexMapsUrl,
} from '../../lib/mapsLinks.js'

function ensureUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
  // allow plain domains
  return `https://${s}`
}

function socialHref(label, value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (label === 'Telegram') {
    if (/^https?:\/\//i.test(v)) return v
    const handle = v.startsWith('@') ? v.slice(1) : v
    return `https://t.me/${handle}`
  }
  if (label === 'Instagram') {
    if (/^https?:\/\//i.test(v)) return v
    const handle = v.startsWith('@') ? v.slice(1) : v
    return `https://instagram.com/${handle}`
  }
  return ensureUrl(v)
}

export default function PublicDetailingPage() {
  const { id } = useParams()
  const r = useRepo()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { detailingId: sessionDetailingId, mode } = useDetailing()
  const [photoLb, setPhotoLb] = useState(null)

  const fromSetup = sp.get('from') === 'setup'
  const isOwnerViewingOwnPage =
    mode === 'detailing' && sessionDetailingId && id && String(sessionDetailingId) === String(id)
  const showSetupSuccess = Boolean(fromSetup && isOwnerViewingOwnPage)

  const det = useMemo(() => (id && r.getDetailing ? r.getDetailing(id) : null), [id, r])
  const detId = det?.id ? String(det.id) : ''
  const lastWorkPhotos = useMemo(() => {
    if (!detId) return []
    const cars = r.listCars?.(detId) || []
    const best = []
    for (const c of Array.isArray(cars) ? cars : []) {
      const carId = c?.id
      if (!carId) continue
      const evts = r.listEvents?.(carId, { detailingId: detId }) || []
      const lastServiceEvt = (Array.isArray(evts) ? evts : []).find((e) => e?.source === 'service') || null
      if (!lastServiceEvt?.id) continue
      const docs = r.listDocs?.(carId, { detailingId: detId }, { eventId: lastServiceEvt.id }) || []
      const firstUrl = (Array.isArray(docs) ? docs : []).find((d) => d?.url)?.url || ''
      const ts = lastServiceEvt.at || lastServiceEvt.updatedAt || lastServiceEvt.createdAt || ''
      if (firstUrl) best.push({ url: firstUrl, ts })
    }
    best.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
    const uniq = []
    const seen = new Set()
    for (const x of best) {
      const u = String(x.url || '')
      if (!u || seen.has(u)) continue
      seen.add(u)
      uniq.push(u)
      if (uniq.length >= 10) break
    }
    return uniq
  }, [r, detId])

  const workGalleryItems = useMemo(
    () => urlsToPhotoItems(lastWorkPhotos, 'Фото работы'),
    [lastWorkPhotos],
  )

  if (!id) return <Navigate to="/about" replace />
  if (!det) return <Navigate to="/about" replace />

  const carsCount = (r.listCars?.(det.id) || []).length
  const addrRaw = String(det.address || '').trim()
  const addressIsYandexUrl = isWholeLineYandexMapsUrl(addrRaw)
  const addressText = [det.city, det.address].filter(Boolean).join(', ')
  const mapsHref = detailingYandexMapsWebHref(det)
  const geoQuery = detailingNavGeocodeQuery(det)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const navHref = geoQuery ? (isIOS ? `maps://?q=${encodeURIComponent(geoQuery)}` : `geo:0,0?q=${encodeURIComponent(geoQuery)}`) : ''
  const addressLinkLabel = addressIsYandexUrl
    ? 'Открыть точку и построить маршрут'
    : det.address || addressText
  const showAddressLink = Boolean(mapsHref)
  const phoneDigits = String(det.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : ''
  const services = Array.isArray(det.servicesOffered) ? det.servicesOffered : []
  const socials = [
    det.website ? { label: 'Сайт', value: String(det.website || '').trim() } : null,
    det.telegram ? { label: 'Telegram', value: String(det.telegram || '').trim() } : null,
    det.instagram ? { label: 'Instagram', value: String(det.instagram || '').trim() } : null,
  ].filter(Boolean)

  return (
    <div className="container">
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/about">О сервисе</Link>
            <span> / </span>
            <span>Страница детейлинга</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/auth" title="Назад" />
            <h1 className="h1" style={{ margin: 0 }}>
              {det.name || 'Детейлинг / СТО'}
            </h1>
          </div>
          <p className="muted carPage__meta carPage__meta--emph">
            <span className="detPublic__kind">Детейлинг</span>
            <span className="detPublic__kindSep" aria-hidden="true">
              {' '}
              /{' '}
            </span>
            <span className="detPublic__kind">СТО</span>
            <span aria-hidden="true"> · </span>
            <span className="detPublic__metaCity">{det.city || '—'}</span>
          </p>
        </div>
      </div>

      {showSetupSuccess ? (
        <Card className="card pad detPublicSetupBanner" style={{ marginTop: 12 }}>
          <div className="row spread gap wrap" style={{ alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Страница готова
              </div>
              <p className="muted small" style={{ margin: '8px 0 0', maxWidth: '58ch', lineHeight: 1.5 }}>
                Так клиенты видят вашу витрину. Добавьте автомобиль в кабинете — оно появится в списке на обслуживании.
              </p>
            </div>
            <div className="row gap wrap detPublicSetupBanner__actions">
              <Link className="btn" data-variant="primary" to="/create">
                Добавить автомобиль
              </Link>
              <Link className="btn" data-variant="outline" to="/detailing">
                Кабинет
              </Link>
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={() => nav(`/d/${encodeURIComponent(String(id))}`, { replace: true })}
              >
                Скрыть
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <div
        className="detHero detHero--card"
        style={det.cover ? { backgroundImage: `url("${String(det.cover).replaceAll('"', '%22')}")` } : undefined}
      >
        <div className="detHero__overlay detHero__overlay--card">
          {det.logo ? (
            <div className="detHero__logo detHero__logo--card">
              <img alt="Логотип" src={det.logo} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="split" style={{ marginTop: 12 }}>
        <Card className="card pad">
          <h2 className="h2">Адрес и контакты сервиса</h2>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">Город</span>
              <span className="kv__v">{det.city || '—'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Адрес</span>
              <span className="kv__v">
                {showAddressLink ? (
                  <a
                    href={addressIsYandexUrl ? mapsHref : navHref || mapsHref}
                    target={addressIsYandexUrl || !navHref ? '_blank' : undefined}
                    rel={addressIsYandexUrl || !navHref ? 'noopener noreferrer' : undefined}
                    title={addressIsYandexUrl ? 'Яндекс.Карты: точка и маршрут' : 'Открыть в навигаторе'}
                    onClick={(e) => {
                      if (addressIsYandexUrl || !navHref) return
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
                    {addressLinkLabel}
                  </a>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Режим работы</span>
              <span className="kv__v kv__v--prewrap">
                {String(det.workingHours || '').trim() || '—'}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Телефон</span>
              <span className="kv__v mono">
                {det.phone ? (
                  <a href={phoneHref} title="Позвонить">
                    {det.phone}
                  </a>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>

          <div className="topBorder">
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              О сервисе
            </div>
            {det.description ? (
              <p className="muted" style={{ lineHeight: 1.55 }}>
                {det.description}
              </p>
            ) : (
              <p className="muted small">
                Описание пока не заполнено. Режим работы задаётся отдельным полем выше; здесь обычно указывают специализацию,
                гарантию и отличия сервиса.
              </p>
            )}
          </div>

          <div className="topBorder">
            <div className="row spread gap" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>
                  Фото работ
                </div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  До 10 последних фото из новых обслуженных авто (с появлением новых старые скрываются).{' '}
                  {PHOTO_LANDSCAPE_HINT_SENTENCE}
                </div>
              </div>
            </div>
            {lastWorkPhotos.length ? (
              <div className="thumbs" style={{ marginTop: 12 }}>
                {lastWorkPhotos.map((u, idx) => (
                  <button
                    key={u}
                    type="button"
                    className="thumb thumb--lb"
                    title="Открыть фото"
                    aria-label="Открыть фото работы"
                    onClick={() =>
                      setPhotoLb({
                        items: workGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                        startIndex: idx,
                      })
                    }
                  >
                    <img alt="Фото работы" src={u} loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="muted small" style={{ marginTop: 12 }}>
                Пока нет фото. Они появятся после визитов с прикреплёнными материалами.
              </div>
            )}
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad">
            <div className="row spread gap" style={{ alignItems: 'center' }}>
              <div className="cardTitle" style={{ marginBottom: 0 }}>
                Услуги сервиса
              </div>
              {services.length ? <Pill tone="accent">{services.length}</Pill> : <Pill>—</Pill>}
            </div>
            {services.length ? (
              <div className="row gap wrap" style={{ marginTop: 12 }}>
                {services.slice(0, 24).map((s) => (
                  <Pill key={s}>{s}</Pill>
                ))}
                {services.length > 24 ? <Pill>+ ещё</Pill> : null}
              </div>
            ) : (
              <p className="muted small" style={{ marginTop: 12 }}>
                Список услуг пока не выбран.
              </p>
            )}
          </Card>

          <Card className="card pad">
            <div className="row spread gap" style={{ alignItems: 'center' }}>
              <div>
                <div className="row gap wrap" style={{ alignItems: 'center' }}>
                  <div className="cardTitle" style={{ marginBottom: 0 }}>
                    Связаться с сервисом
                  </div>
                  <ServiceHint scopeId="public-detailing-call-hint" variant="compact" label="Справка: звонок">
                    <p className="serviceHint__panelText">
                      Нажмите «Позвонить», чтобы связаться с детейлингом по указанному номеру телефона.
                    </p>
                  </ServiceHint>
                </div>
              </div>
              {det.phone ? (
                <a className="btn" data-variant="primary" href={phoneHref} style={{ whiteSpace: 'nowrap' }}>
                  Позвонить
                </a>
              ) : null}
            </div>

            {socials.length ? (
              <div className="topBorder">
                <div className="kv">
                  {socials.map((x) => (
                    <div key={x.label} className="kv__row">
                      <span className="kv__k">{x.label}</span>
                      <span className="kv__v mono">
                        {(() => {
                          const href = socialHref(x.label, x.value)
                          return href ? (
                            <a href={href} target="_blank" rel="noreferrer" title="Открыть ссылку">
                              {x.value}
                            </a>
                          ) : (
                            x.value
                          )
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!det.phone ? (
              <div className="topBorder">
                <p className="muted small">Телефон не указан — кнопку звонка показать нельзя.</p>
              </div>
            ) : null}
          </Card>

          <Card className="card pad">
            <div className="row spread gap">
              <div className="cardTitle" style={{ marginBottom: 0 }}>
                Автомобили в сервисе
              </div>
              <Pill tone="accent">{carsCount}</Pill>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Авто на обслуживании сейчас: <strong>{carsCount}</strong>.
            </p>
          </Card>
        </div>
      </div>
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}

