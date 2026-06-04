import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide13(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Чек-лист после выступления', 'раздатка')
  const left = ['Заявки в одной системе', 'Карточка клиента', 'История автомобиля', 'Контроль этапа работы', 'Ответственный за клиента', 'Источник заявки']
  const right = ['Дата следующего контакта', 'Системный сбор отзывов', 'База для повторных продаж', 'Понятные показатели', 'Публичная страница', 'План внедрения CRM']
  left.forEach((v, i) => {
    box(slide, 82, 196 + i * 58, 28, 28, { fill: C.white, stroke: C.green, lineWidth: 2 })
    text(slide, v, 128, 192 + i * 58, 420, 36, { size: 23 })
  })
  right.forEach((v, i) => {
    box(slide, 650, 196 + i * 58, 28, 28, { fill: C.white, stroke: C.green, lineWidth: 2 })
    text(slide, v, 696, 192 + i * 58, 420, 36, { size: 23 })
  })
  box(slide, 130, 604, 920, 50, { round: true, fill: C.green2, stroke: C.green2, text: '4+ “нет” — повод подключить КарПас и начать фиксировать клиентов, авто и визиты.', size: 24, bold: true, color: C.green, align: 'center' })
  footer(slide, 13)
  notes(slide, 'Можно распечатать чек-лист отдельно или отправить после выступления. Здесь снова закрепляем простое действие: не купить сложную систему, а начать фиксировать бизнес в КарПас.')
  return slide
}
