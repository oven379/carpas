import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo } from 'react'
import { absoluteUrl } from '../lib/siteOrigin.js'
import { truncateMetaDescription } from './seoUtils.js'
import { SEO_DEFAULT_OG_IMAGE_PATH, SITE_NAME } from './seoConstants.js'

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === '') el.removeAttribute(key)
    else el.setAttribute(key, value)
  })
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * @param {object} props
 * @param {string} props.title — полная строка <title> (уже с «· КарПас» или маркетинговый вариант).
 * @param {string} [props.description]
 * @param {string} [props.canonicalPath] — путь с «/», без origin; для кабинета обычно не задаём.
 * @param {boolean} [props.noindex]
 * @param {string} [props.ogType] — website | article
 * @param {string} [props.ogImage] — абсолютный URL или путь от /
 * @param {object|object[]} [props.jsonLd] — один или несколько объектов schema.org
 */
export function Seo({ title, description, canonicalPath, noindex = false, ogType = 'website', ogImage, jsonLd }) {
  const desc = description ? truncateMetaDescription(description) : ''
  const canonical = canonicalPath != null && canonicalPath !== '' ? absoluteUrl(canonicalPath) : null
  let ogImageAbs = ''
  if (ogImage) {
    ogImageAbs = /^https?:\/\//i.test(ogImage) ? ogImage : absoluteUrl(ogImage.startsWith('/') ? ogImage : `/${ogImage}`)
  } else {
    ogImageAbs = absoluteUrl(SEO_DEFAULT_OG_IMAGE_PATH)
  }

  const ldList = useMemo(() => (jsonLd == null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd]), [jsonLd])

  const ogImageFinal = ogImageAbs && /^https?:\/\//i.test(ogImageAbs) ? ogImageAbs : ''
  const googleVerification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || ''
  const yandexVerification = import.meta.env.VITE_YANDEX_VERIFICATION || ''

  useEffect(() => {
    document.title = title
    if (desc) upsertMeta('meta[name="description"]', { name: 'description', content: desc })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' })
    if (googleVerification) {
      upsertMeta('meta[name="google-site-verification"]', {
        name: 'google-site-verification',
        content: googleVerification,
      })
    }
    if (yandexVerification) {
      upsertMeta('meta[name="yandex-verification"]', { name: 'yandex-verification', content: yandexVerification })
    }
    upsertCanonical(canonical)

    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    if (desc) upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc })
    if (canonical) upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: ogType })
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'ru_RU' })
    if (ogImageFinal) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImageFinal })

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: ogImageFinal ? 'summary_large_image' : 'summary' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    if (desc) upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: desc })

    document.head.querySelectorAll('script[data-carpas-seo-jsonld="true"]').forEach((el) => el.remove())
    ldList.forEach((obj) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.carpasSeoJsonld = 'true'
      script.textContent = JSON.stringify(obj)
      document.head.appendChild(script)
    })
  }, [canonical, desc, googleVerification, ldList, noindex, ogImageFinal, ogType, title, yandexVerification])

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      {desc ? <meta name="description" content={desc} /> : null}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      {googleVerification ? (
        <meta name="google-site-verification" content={googleVerification} />
      ) : null}
      {yandexVerification ? <meta name="yandex-verification" content={yandexVerification} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      {desc ? <meta property="og:description" content={desc} /> : null}
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="ru_RU" />
      {ogImageFinal ? <meta property="og:image" content={ogImageFinal} /> : null}

      <meta name="twitter:card" content={ogImageFinal ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      {desc ? <meta name="twitter:description" content={desc} /> : null}

      {ldList.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  )
}
