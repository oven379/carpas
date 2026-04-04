import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { Card, Pill } from '../components.jsx'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { urlsToPhotoItems } from '../../lib/photoGallery.js'

function ensureUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
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
  const [sp] = useSearchParams()
  const r = useRepo()
  const { detailingId: sessionDetailingId, mode } = useDetailing()
  const [photoLb, setPhotoLb] = useState(null)
  const [payload, setPayload] = useState(undefined)

  const idNorm = String(id || '').trim()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!idNorm) {
        setPayload(null)
        return
      }
      try {
        const data = await r.publicDetailingShowcase(idNorm)
        if (!cancelled) setPayload(data || null)
      } catch {
        if (!cancelled) setPayload(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [idNorm, r, r._version])

  const det = payload?.detailing ?? null
  const carsCount = typeof payload?.carsCount === 'number' ? payload.carsCount : 0
  const lastWorkPhotos = Array.isArray(payload?.lastWorkPhotos) ? payload.lastWorkPhotos : []

  const workGalleryItems = useMemo(
    () => urlsToPhotoItems(lastWorkPhotos, 'Фото работы'),
    [lastWorkPhotos],
  )

  if (!idNorm) return <Navigate to="/about" replace />

  if (payload === undefined) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!det) return <Navigate to="/about" replace />

  const fromSetup = sp.get('from') === 'setup'
  const isOwnerViewingOwnPage =
    mode === 'detailing' && sessionDetailingId && idNorm && String(sessionDetailingId) === String(idNorm)
  const showSetupSuccess = Boolean(fromSetup && isOwnerViewingOwnPage)

  const addressText = [det.city, det.address].filter(Boolean).join(', ')
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const mapsHref = addressText ? `https://yandex.ru/maps/?text=${encodeURIComponent(addressText)}` : ''
  const navHref = addressText ? (isIOS ? `maps://?q=${encodeURIComponent(addressText)}` : `geo:0,0?q=${encodeURIComponent(addressText)}`) : ''
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
      {showSetupSuccess ? (
        <Card className="card pad" style={{ marginBottom: 16 }}>
          <div className="cardTitle" style={{ marginBottom: 6 }}>
            Публичная страница готова
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Настройки сохранены. Эту страницу можно отправить клиентам — публичная страница сервиса на улице.
          </p>
        </Card>
      ) : null}
      <div className="row spread gap carPage__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/about">О сервисе</Link>
            <span> / </span>
            <span>Страница детейлинга</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
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
          <div className="detHero__bottomRow">
            <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
              <Pill tone="accent">Авто на обслуживании: {carsCount}</Pill>
              {services.length ? <Pill>{`Услуг: ${services.length}`}</Pill> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="split" style={{ marginTop: 12 }}>
        <Card className="card pad">
          <h2 className="h2">Информация</h2>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">Город</span>
              <span className="kv__v">{det.city || '—'}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Адрес</span>
              <span className="kv__v">
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
                  '—'
                )}
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
                Описание пока не заполнено. Обычно здесь пишут специализацию, режим работы, гарантию и чем вы отличаетесь.
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
                  До 10 последних фото из новых обслуженных авто (с появлением новых старые скрываются).
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
                Услуги
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
                <div className="cardTitle" style={{ marginBottom: 0 }}>
                  Связаться
                </div>
                <div className="muted small">Нажмите, чтобы позвонить в детейлинг.</div>
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
                Статистика
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
