import { absoluteUrl } from '../lib/siteOrigin.js'

export function buildHomePageJsonLd() {
  const homeUrl = absoluteUrl('/')
  const absOk = homeUrl.startsWith('http')

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Carpass',
    alternateName: 'КарПас',
    description:
      'Сервис истории обслуживания автомобилей в России для владельцев, детейлинга и СТО. Публичная ссылка на историю при продаже авто.',
  }
  if (absOk) org.url = homeUrl

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Carpass',
    alternateName: 'КарПас',
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: 'Carpass', alternateName: 'КарПас' },
  }
  if (absOk) website.url = homeUrl

  return [org, website]
}
