import { absoluteUrl } from '../lib/siteOrigin.js'

/** Тексты FAQ по смыслу совпадают с блоком на HomePage (без HTML). */
const FAQ_ITEMS = [
  {
    q: 'Покупатель увидит всё про меня?',
    a: 'Нет. Публичная ссылка предназначена для истории авто. Пароль и данные кабинета детейлинга не раскрываются.',
  },
  {
    q: 'Что именно фиксируется при визите?',
    a: 'Дата и время, пробег, перечень работ (мойка, осмотр, полировка и т.д.), заметки, а также фото и документы при необходимости.',
  },
  {
    q: 'Можно ли отозвать публичную ссылку?',
    a: 'Да: ссылку можно отозвать в кабинете или выпустить новую — по старой ссылке войти уже не получится.',
  },
  {
    q: 'Чем отличаются публичные ссылки?',
    a: 'Три разных адреса: /share/ — публичная история одной машины; /g/ — публичная витрина гаража; /d/ — страница детейлинга для клиентов. Посторонний по ссылке не получает пароль к кабинету.',
  },
]

export function buildHomePageJsonLd() {
  const aboutUrl = absoluteUrl('/about')
  const absOk = aboutUrl.startsWith('http')

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
  if (absOk) org.url = aboutUrl

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'КарПас',
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: 'КарПас' },
  }
  if (absOk) website.url = aboutUrl

  return [org, website, faq]
}
