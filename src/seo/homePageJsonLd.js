import { absoluteUrl } from '../lib/siteOrigin.js'

/** Тексты FAQ совпадают с блоком на странице /about (без HTML). */
const FAQ_ITEMS = [
  {
    q: 'Покупатель увидит всё про меня?',
    a: 'Нет. Публичная ссылка предназначена для истории авто. Пароль и данные кабинета детейлинга не раскрываются.',
  },
  {
    q: 'Что именно фиксируется при визите?',
    a: 'Дата/время, пробег, перечень работ (мойка/осмотр/полировка и т.д.), заметки, а также фото/документы при необходимости.',
  },
  {
    q: 'Можно ли отозвать публичную ссылку?',
    a: 'В полной версии — да (отзыв токена). В текущем MVP ссылку можно пересоздать, и старую отключим на этапе бэкенда.',
  },
  {
    q: 'Это приложение уже подключено к серверу?',
    a: 'Сейчас данные локальные (для прототипа). Но API‑контракт уже заложен — подключение сервера будет заменой режима с mock на real.',
  },
]

export function buildHomePageJsonLd() {
  const homeUrl = absoluteUrl('/')
  const absOk = homeUrl.startsWith('http')

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: x.a,
      },
    })),
  }

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'КарПас',
    description:
      'Сервис истории обслуживания автомобилей в России для владельцев, детейлинга и СТО. Публичная ссылка на историю при продаже авто.',
  }
  if (absOk) org.url = homeUrl

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'КарПас',
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: 'КарПас' },
  }
  if (absOk) website.url = homeUrl

  return [org, website, faq]
}
