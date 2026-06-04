import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide09(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Репутация — отдельный канал продаж', 'карты и отзывы')
  const loop = [
    ['Качественная работа', C.green2],
    ['Фото / видео результата', C.blue2],
    ['Просьба об отзыве', C.amber2],
    ['Ответ на отзыв', C.white],
    ['Рост доверия на картах', C.green2],
  ]
  loop.forEach((l, i) => {
    const x = 92 + i * 220
    box(slide, x, 250, 160, 90, { round: true, fill: l[1], stroke: l[1], text: l[0], size: 21, bold: true, color: C.ink, align: 'center' })
    if (i < loop.length - 1) box(slide, x + 168, 292, 52, 4, { fill: C.green, line: false })
  })
  text(slide, 'Что фиксировать в CRM: кто был клиентом, какую услугу сделали, когда выдали авто, кто должен попросить отзыв и когда повторно связаться.', 152, 458, 920, 78, { size: 28, color: C.green, bold: true, align: 'center' })
  footer(slide, 9)
  notes(slide, 'Сделать акцент: отзывы — не “приятный бонус”, а часть маркетингового процесса. После выдачи авто клиент максимально готов оставить отзыв, если результат свежий и есть фото.')
  return slide
}
