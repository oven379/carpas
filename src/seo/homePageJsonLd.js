import { absoluteUrl } from '../lib/siteOrigin.js'

export function buildHomePageJsonLd() {
  const homeUrl = absoluteUrl('/')
  const absOk = homeUrl.startsWith('http')

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'КарПас',
    alternateName: ['Кар Пас', 'карпас', 'карпасс', 'карпассс', 'Car Passs', 'Carpas', 'carpasss', 'carpass'],
    description:
      'Сервис истории обслуживания автомобилей в России для владельцев, детейлинга и СТО. Публичная ссылка на историю при продаже авто.',
  }
  if (absOk) org.url = homeUrl

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'КарПас',
    alternateName: ['Кар Пас', 'карпас', 'карпасс', 'Carpas', 'carpass'],
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: 'КарПас', alternateName: 'Carpass' },
  }
  if (absOk) website.url = homeUrl

  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'КарПас',
    alternateName: 'Carpass',
    applicationCategory: 'AutoApplication',
    operatingSystem: 'iOS, Android, Web',
    description:
      'Приложение для владельцев авто и CRM для детейлинга, СТО и автосервисов: история обслуживания, пробег, документы, фотографии и напоминания.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
  }
  if (absOk) app.url = homeUrl

  return [org, website, app]
}
