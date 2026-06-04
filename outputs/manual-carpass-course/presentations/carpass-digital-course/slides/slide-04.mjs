import { C, header, footer, box, text, lane, notes } from './common.mjs'

export async function slide04(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Цифровизация — это путь клиента от заявки до повторного визита', 'процесс')
  const steps = [
    ['1. Заявка', 'телефон · сайт · карты · мессенджеры'],
    ['2. Клиент и авто', 'имя · телефон · VIN · госномер'],
    ['3. Визит', 'услуги · пробег · мастер · фото'],
    ['4. История', 'что делали · рекомендации · документы'],
    ['5. Возврат', 'следующий контакт · отзыв · допродажа'],
  ]
  steps.forEach((s, i) => {
    const x = 76 + i * 226
    lane(slide, s[0], x, 226, 178, 58, i === 0 ? C.blue2 : i === 4 ? C.green2 : C.white, i === 0 ? C.blue : i === 4 ? C.green : C.ink)
    text(slide, s[1], x, 302, 178, 70, { size: 18, color: C.muted, align: 'center' })
    if (i < steps.length - 1) box(slide, x + 184, 252, 44, 4, { fill: C.green, line: false })
  })
  box(slide, 140, 442, 980, 82, { round: true, fill: '#EEF5F0', stroke: '#EEF5F0', text: 'CRM нужна не “для порядка ради порядка”, а чтобы каждый этап стал видимым, измеримым и повторяемым.', size: 28, bold: true, color: C.green, align: 'center' })
  footer(slide, 4)
  notes(slide, 'Пояснить: цифровизация не начинается с дорогих интеграций. Она начинается с того, что заявка, клиент, автомобиль и следующий шаг фиксируются в системе. Это мост к КарПас.')
  return slide
}
