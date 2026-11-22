import { absoluteUrl } from '../lib/siteOrigin.js'
import { SITE_ALTERNATE_NAME, SITE_NAME } from './seoConstants.js'

export function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function buildSoftwareJsonLd({ path, name, description, audience }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: name.replaceAll('КарПас', SITE_NAME),
    alternateName: SITE_ALTERNATE_NAME,
    applicationCategory: 'AutoApplication',
    operatingSystem: 'iOS, Android, Web',
    url: absoluteUrl(path),
    description,
    audience: audience ? { '@type': 'Audience', audienceType: audience } : undefined,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }
}

export function buildFaqJsonLd(questions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
