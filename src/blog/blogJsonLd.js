import { absoluteUrl } from '../lib/siteOrigin.js'

/** BlogPosting-разметка для статьи блога. */
export function buildArticleJsonLd({ slug, title, description, datePublished, dateModified }) {
  const url = absoluteUrl(`/blog/${slug}`)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    inLanguage: 'ru-RU',
    datePublished,
    dateModified: dateModified || datePublished,
    author: { '@type': 'Organization', name: 'КарПас' },
    publisher: {
      '@type': 'Organization',
      name: 'КарПас',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/apple-touch-icon.png') },
    },
    image: absoluteUrl('/og.png'),
  }
  if (url.startsWith('http')) {
    jsonLd.url = url
    jsonLd.mainEntityOfPage = { '@type': 'WebPage', '@id': url }
  }
  return jsonLd
}
