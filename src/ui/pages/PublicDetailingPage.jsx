import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { BackNav, Card, DropdownCaretIcon, HeroCoverStat, PageLoadSpinner, Pill } from '../components.jsx'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { urlsToPhotoItems } from '../../lib/photoGallery.js'
import { displayRuPhone } from '../../lib/format.js'
import { absoluteUrl } from '../../lib/siteOrigin.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'
import { Seo } from '../../seo/Seo.jsx'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
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

function mediaUrlToOgImage(url) {
  const u = resolvePublicMediaUrl(url)
  if (!u) return undefined
  if (/^https?:\/\//i.test(u)) return u
  return absoluteUrl(u.startsWith('/') ? u : `/${u}`)
}

export default function PublicDetailingPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const r = useRepo()
  const { detailingId: sessionDetailingId, mode } = useDetailing()
  const [photoLb, setPhotoLb] = useState(null)
  const [payload, setPayload] = useState(undefined)
  const [servicesExpanded, setServicesExpanded] = useState(false)

  const idNorm = String(id || '').trim()

  useEffect(() => {
    setServicesExpanded(false)
  }, [idNorm])

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
  const lastWorkPhotos = useMemo(
    () => (Array.isArray(payload?.lastWorkPhotos) ? payload.lastWorkPhotos : []),
    [payload],
  )

  const workGalleryItems = useMemo(
    () => urlsToPhotoItems(lastWorkPhotos, 'Фото работы'),
    [lastWorkPhotos],
  )

  if (!idNorm) return <Navigate to="/" replace />

  if (payload === undefined) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <Seo
          title="Страница сервиса · КарПас"
          description="Публичная страница детейлинга или СТО в сервисе КарПас: контакты, услуги, режим работы."
          canonicalPath={`/d/${idNorm}`}
        />
        <PageLoadSpinner />
      </div>
    )
  }
  if (!det) return <Navigate to="/" replace />

  const devName = String(det.name || 'Сервис').trim()
  const citySeo = String(det.city || '').trim()
  const seoTitle = `${devName} — услуги и контакты${citySeo ? `, ${citySeo}` : ''} · КарПас`
  const servicesLine = Array.isArray(det.servicesOffered) ? det.servicesOffered.slice(0, 6).join(', ') : ''
  const seoDescRaw =
    String(det.description || '').trim() ||
    [servicesLine && `Услуги: ${servicesLine}.`, `${devName} — детейлинг и СТО в КарПас.`, citySeo && citySeo].filter(Boolean).join(' ')
  const seoDesc = truncateMetaDescription(seoDescRaw)
  const canonicalPath = `/d/${idNorm}`
  const ogImage = mediaUrlToOgImage(det.cover)
  const absPage = absoluteUrl(canonicalPath).startsWith('http')
  const hasAddressParts = Boolean(citySeo || String(det.address || '').trim())
  const addressSchema = hasAddressParts
    ? {
        '@type': 'PostalAddress',
        ...(citySeo ? { addressLocality: citySeo } : {}),
        ...(String(det.address || '').trim() ? { streetAddress: String(det.address).trim() } : {}),
      }
    : null
  const jsonLdDet =
    absPage && devName
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'КарПас',
                item: absoluteUrl('/'),
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: devName,
                item: absoluteUrl(canonicalPath),
              },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'AutomotiveBusiness',
            name: devName,
            url: absoluteUrl(canonicalPath),
            ...(addressSchema && (addressSchema.addressLocality || addressSchema.streetAddress)
              ? { address: addressSchema }
              : {}),
          },
        ]
      : null

  const publicCoverBg = resolvedBackgroundImageUrl(det.cover)
  const detInitials = String(det?.name || 'Д').trim().slice(0, 2).toUpperCase()

  const fromSetup = sp.get('from') === 'setup'
  const isOwnerViewingOwnPage =
    mode === 'detailing' && sessionDetailingId && idNorm && String(sessionDetailingId) === String(idNorm)
  const showSetupSuccess = Boolean(fromSetup && isOwnerViewingOwnPage)

  const addressText = [det.city, det.address].filter(Boolean).join(', ')
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const mapsHref = addressText ? `https://yandex.ru/maps/?text=${encodeURIComponent(addressText)}` : ''
  const navHref = addressText ? (isIOS ? `maps://?q=${encodeURIComponent(addressText)}` : `geo:0,0?q=${encodeURIComponent(addressText)}`) : ''
  const { display: phoneDisplay, telHref: phoneTelHref } = displayRuPhone(det.phone)
  const services = Array.isArray(det.servicesOffered) ? det.servicesOffered : []
  const servicesPreviewCount = 3
  const hasMoreServices = services.length > servicesPreviewCount
  const servicesVisible =
    !hasMoreServices || servicesExpanded ? services : services.slice(0, servicesPreviewCount)
  const socials = [
    det.website ? { label: 'Сайт', value: String(det.website || '').trim() } : null,
    det.telegram ? { label: 'Telegram', value: String(det.telegram || '').trim() } : null,
    det.instagram ? { label: 'Instagram', value: String(det.instagram || '').trim() } : null,
  ].filter(Boolean)

  return (
    <div className="container">
      <Seo
        title={seoTitle}
        description={seoDesc}
        canonicalPath={canonicalPath}
        ogImage={ogImage}
        jsonLd={jsonLdDet}
      />
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
            <Link to="/">Главная</Link>
            <span> / </span>
            <span>Страница детейлинга</span>
          </div>
          <div className="row gap wrap carPage__titleRow" style={{ alignItems: 'center' }}>
            <BackNav
              title="Назад"
              fallbackTo={isOwnerViewingOwnPage ? '/detailing' : '/'}
            />
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
        style={publicCoverBg ? { backgroundImage: publicCoverBg } : undefined}
      >
        <div className="detHero__overlay detHero__overlay--card detHero__overlay--bannerMetrics">
          <div className="detHero__bottomRow">
            <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
              <HeroCoverStat
                kind="car"
                variant="overlay"
                value={carsCount}
                label="на обслуживании"
                title={`${carsCount} ${carsCount === 1 ? 'автомобиль' : carsCount < 5 ? 'автомобиля' : 'автомобилей'} на обслуживании`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="split" style={{ marginTop: 12 }}>
        <Card className="card pad">
          <div className="detPublicInfoCard__headRow">
            <div className="detPublicInfoCard__headMain">
              <h2 className="h2">Информация:</h2>
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
                      } catch {
                        /* ignore */
                      }
                      setTimeout(() => {
                        try {
                          window.open(mapsHref, '_blank', 'noreferrer')
                        } catch {
                          /* ignore */
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
                {phoneDisplay ? (
                  phoneTelHref ? (
                    <a href={phoneTelHref} title="Позвонить">
                      {phoneDisplay}
                    </a>
                  ) : (
                    phoneDisplay
                  )
                ) : (
                  '—'
                )}
              </span>
            </div>
            {String(det.workingHours || '').trim() ? (
              <div className="kv__row">
                <span className="kv__k">Режим работы</span>
                <span className="kv__v" style={{ whiteSpace: 'pre-wrap' }}>
                  {String(det.workingHours).trim()}
                </span>
              </div>
            ) : null}
              </div>
            </div>
            <div className="detPublicInfoCard__logoCol">
              {det.logo ? (
                <div
                  className="detPublicInfoCard__logo"
                  title={String(det.name || '').trim() || undefined}
                >
                  <img alt="" src={resolvePublicMediaUrl(det.logo)} decoding="async" />
                </div>
              ) : (
                <div
                  className="detPublicInfoCard__logo detPublicInfoCard__logo--fallback"
                  title={String(det.name || '').trim() || undefined}
                >
                  <span aria-hidden="true">{detInitials}</span>
                </div>
              )}
            </div>
          </div>

          <div className="topBorder">
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              Описание
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
                  До 10 снимков: только визиты детейлинга, где при сохранении отмечено разрешение на публикацию, плюс фото
                  после мойки с карточки авто при том же условии (по дате работ).
                </div>
              </div>
            </div>
            {workGalleryItems.length ? (
              <div className="thumbs" style={{ marginTop: 12 }}>
                {workGalleryItems.map((item, idx) => (
                  <button
                    key={item.id}
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
                    <img alt="Фото работы" src={item.url} loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="muted small" style={{ marginTop: 12 }}>
                Пока нет фото. Добавьте снимки к визиту в истории или после мойки — они подтянутся сюда.
              </div>
            )}
          </div>
        </Card>

        <div className="col gap">
          <Card className="card pad detPublicServicesCard">
            {hasMoreServices ? (
              <button
                type="button"
                className="dropdownCaretBtn dropdownCaretBtn--floating detPublicServicesCard__expand"
                aria-expanded={servicesExpanded ? 'true' : 'false'}
                onClick={() => setServicesExpanded((v) => !v)}
                title={servicesExpanded ? 'Свернуть' : 'Показать все услуги'}
                aria-label={servicesExpanded ? 'Свернуть список услуг' : 'Развернуть список услуг'}
              >
                <DropdownCaretIcon open={servicesExpanded} />
              </button>
            ) : null}
            <div
              className={`cardTitle detPublicServicesCard__title${hasMoreServices ? ' detPublicServicesCard__title--withExpand' : ''}`}
              style={{ marginBottom: 0 }}
            >
              Услуги
            </div>
            {services.length ? (
              <div className="row gap wrap" style={{ marginTop: 12 }}>
                {servicesVisible.map((s, i) => (
                  <Pill key={`${i}-${String(s)}`}>{s}</Pill>
                ))}
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
              {phoneTelHref ? (
                <a className="btn" data-variant="primary" href={phoneTelHref} style={{ whiteSpace: 'nowrap' }}>
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

            {!phoneDisplay ? (
              <div className="topBorder">
                <p className="muted small">Телефон не указан — кнопку звонка показать нельзя.</p>
              </div>
            ) : null}
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
