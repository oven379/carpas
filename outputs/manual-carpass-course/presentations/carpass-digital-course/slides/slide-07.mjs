import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide07(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Маркетинг: каналы работают лучше, когда заявки попадают в CRM', '50% маркетинг')
  const rows = [
    ['Карты', 'Яндекс Карты · 2ГИС', 'Отзывы, фото, быстрый звонок, локальный спрос'],
    ['Поиск', 'Яндекс Директ · SEO', 'Горячие запросы: услуга + город + проблема'],
    ['Маркетплейсы', 'Авито', 'Быстрые лиды по конкретным услугам и пакетам'],
    ['Соцсети', 'VK · Telegram · видео', 'Доверие, экспертность, кейсы до/после'],
    ['Партнерства', 'автосалоны · мойки · клубы', 'Поток клиентов через соседние автоуслуги'],
  ]
  box(slide, 64, 185, 1070, 52, { fill: C.dark, stroke: C.dark })
  text(slide, 'Канал', 88, 199, 160, 24, { fill: C.dark, size: 18, bold: true, color: C.white })
  text(slide, 'Примеры', 302, 199, 280, 24, { fill: C.dark, size: 18, bold: true, color: C.white })
  text(slide, 'Что дает', 650, 199, 430, 24, { fill: C.dark, size: 18, bold: true, color: C.white })
  rows.forEach((r, i) => {
    const y = 238 + i * 72
    box(slide, 64, y, 1070, 62, { fill: i % 2 ? C.white : '#FBFCF9', stroke: C.line })
    text(slide, r[0], 88, y + 14, 160, 26, { fill: i % 2 ? C.white : '#FBFCF9', size: 21, bold: true, color: C.green })
    text(slide, r[1], 302, y + 14, 280, 26, { fill: i % 2 ? C.white : '#FBFCF9', size: 20 })
    text(slide, r[2], 650, y + 14, 430, 26, { fill: i % 2 ? C.white : '#FBFCF9', size: 20, color: C.muted })
  })
  footer(slide, 7)
  notes(slide, 'Сказать: ограниченные платформы можно обсуждать прагматично, если они дают трафик и записи, но для России базовая опора — Яндекс, карты, Авито, VK, Telegram и локальные партнерства.')
  return slide
}
