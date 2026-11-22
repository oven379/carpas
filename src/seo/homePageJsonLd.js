import { absoluteUrl } from '../lib/siteOrigin.js'
import { SITE_ALTERNATE_NAME, SITE_NAME } from './seoConstants.js'

export function buildHomePageJsonLd() {
  const homeUrl = absoluteUrl('/')
  const absOk = homeUrl.startsWith('http')

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    description:
      'Сервис истории обслуживания автомобилей в России для владельцев, детейлинга, тюнинга и СТО. Публичная ссылка на историю при продаже авто.',
    sameAs: ['https://rutube.ru/channel/32016425/', 'https://dzen.ru/itteam379'],
  }
  if (absOk) {
    org.url = homeUrl
    org.logo = absoluteUrl('/apple-touch-icon.png')
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }
  if (absOk) website.url = homeUrl

  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    applicationCategory: 'AutoApplication',
    operatingSystem: 'iOS, Android, Web',
    description:
      'Приложение для владельцев авто и CRM для детейлинга, СТО и автосервисов: история обслуживания, пробег, документы, фотографии и напоминания.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
  }
  if (absOk) app.url = homeUrl

  return [org, website, app]
}
