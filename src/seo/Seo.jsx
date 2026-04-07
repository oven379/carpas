import { Helmet } from 'react-helmet-async'
import { absoluteUrl } from '../lib/siteOrigin.js'
import { truncateMetaDescription } from './seoUtils.js'
import { SEO_DEFAULT_OG_IMAGE_PATH, SITE_NAME } from './seoConstants.js'

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

  const ldList = jsonLd == null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd]

  const ogImageFinal = ogImageAbs && /^https?:\/\//i.test(ogImageAbs) ? ogImageAbs : ''

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      {desc ? <meta name="description" content={desc} /> : null}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
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
