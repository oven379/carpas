import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide12(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Если у вас только 30 минут: оставьте 6 слайдов', 'короткая версия')
  const route = [
    ['01', 'Открытие и цель'],
    ['02', 'Карта потерь'],
    ['03', 'Мини-аудит'],
    ['05', 'Что закрывает КарПас'],
    ['07', 'Маркетинговые каналы'],
    ['14', 'Подключение через QR'],
  ]
  route.forEach((r, i) => {
    const x = 96 + (i % 3) * 350
    const y = 210 + Math.floor(i / 3) * 170
    box(slide, x, y, 92, 92, { round: true, fill: C.green, stroke: C.green, text: r[0], size: 34, bold: true, color: C.white, align: 'center' })
    text(slide, r[1], x + 112, y + 16, 190, 58, { size: 25, bold: true })
  })
  box(slide, 170, 580, 860, 52, { round: true, fill: C.blue2, stroke: C.blue2, text: 'Остальные слайды держите как резерв для вопросов или длинного формата.', size: 24, bold: true, color: C.blue, align: 'center' })
  footer(slide, 12)
  notes(slide, 'Этот слайд можно не показывать аудитории, но он полезен тебе как навигация. Для 30 минут не пытаться пройти все: нужно сохранить тезис, мини-аудит, продукт и QR.')
  return slide
}
