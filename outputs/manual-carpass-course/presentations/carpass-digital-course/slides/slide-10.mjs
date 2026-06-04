import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide10(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Повторные продажи начинаются в день первого визита', 'удержание')
  box(slide, 98, 210, 260, 260, { round: true, fill: C.white, stroke: C.line })
  text(slide, 'Первый визит', 128, 240, 200, 34, { fill: C.white, size: 27, bold: true, align: 'center' })
  text(slide, 'записали услуги,\nпробег, фото,\nрекомендации', 128, 305, 200, 96, { fill: C.white, size: 23, color: C.muted, align: 'center' })
  box(slide, 464, 210, 260, 260, { round: true, fill: C.green2, stroke: C.green2 })
  text(slide, 'Следующий контакт', 494, 240, 200, 34, { fill: C.green2, size: 27, bold: true, color: C.green, align: 'center' })
  text(slide, 'напомнить,\nпригласить,\nпредложить уход', 494, 305, 200, 96, { fill: C.green2, size: 23, color: C.ink, align: 'center' })
  box(slide, 830, 210, 260, 260, { round: true, fill: C.white, stroke: C.line })
  text(slide, 'Повторный визит', 860, 240, 200, 34, { fill: C.white, size: 27, bold: true, align: 'center' })
  text(slide, 'выше доверие,\nниже стоимость,\nбольше средний чек', 860, 305, 200, 96, { fill: C.white, size: 23, color: C.muted, align: 'center' })
  box(slide, 370, 334, 90, 4, { fill: C.green, line: false })
  box(slide, 736, 334, 90, 4, { fill: C.green, line: false })
  box(slide, 174, 548, 840, 56, { round: true, fill: C.amber2, stroke: C.amber2, text: 'В КарПас это поддерживают история визитов, заметки по клиенту и дата следующего контакта.', size: 24, bold: true, color: '#6A4A09', align: 'center' })
  footer(slide, 10)
  notes(slide, 'Тезис: повторная продажа не возникает через полгода сама. Ее надо планировать в момент визита. Пример: после керамики назначить контрольный уход; после ТО — следующий пробег или сезонную проверку.')
  return slide
}
