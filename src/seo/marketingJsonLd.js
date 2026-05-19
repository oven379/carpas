import { absoluteUrl } from '../lib/siteOrigin.js'

const BRAND_ALIASES = ['Кар Пас', 'карпас', 'карпасс', 'карпассс', 'Car Passs', 'Carpas', 'carpasss', 'carpass']

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
    name,
    alternateName: BRAND_ALIASES,
    applicationCategory: 'AutoApplication',
    operatingSystem: 'iOS, Android, Web',
    url: absoluteUrl(path),
    description,
    audience: audience ? { '@type': 'Audience', audienceType: audience } : undefined,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    publisher: { '@type': 'Organization', name: 'КарПас', alternateName: 'Carpass' },
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
