import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide06(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Как подключается сервис', 'онбординг')
  const steps = [
    ['1', 'Сканирует QR или заходит на carpasss.ru'],
    ['2', 'Оставляет заявку партнера: название, контакты, город, адрес'],
    ['3', 'Администратор подтверждает аккаунт'],
    ['4', 'На почту приходит логин и пароль'],
    ['5', 'Сервис настраивает лендинг и начинает вести клиентов'],
  ]
  steps.forEach((s, i) => {
    const x = 96 + i * 220
    box(slide, x, 220, 80, 80, { round: true, fill: i === 4 ? C.green : C.white, stroke: i === 4 ? C.green : C.line, text: s[0], size: 36, bold: true, color: i === 4 ? C.white : C.green, align: 'center' })
    text(slide, s[1], x - 30, 328, 140, 118, { size: 19, color: C.ink, align: 'center' })
    if (i < steps.length - 1) box(slide, x + 90, 258, 120, 4, { fill: C.line, line: false })
  })
  box(slide, 180, 530, 880, 64, { round: true, fill: C.amber2, stroke: C.amber2, text: 'Формулировка со сцены: “Сейчас доступ к текущему функционалу на этапе запуска бесплатный”.', size: 24, bold: true, color: '#6A4A09', align: 'center' })
  footer(slide, 6)
  notes(slide, 'Подключение нужно показать простым. Уточнить: сейчас заявка подтверждается через админ-панель, после подтверждения логин и пароль приходят на почту. Это снимает страх внедрения.')
  return slide
}
