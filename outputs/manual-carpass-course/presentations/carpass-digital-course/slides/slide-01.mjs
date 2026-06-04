import { C, box, text, pill, notes } from './common.mjs'

export async function slide01(presentation) {
  const slide = presentation.slides.add()
  box(slide, 0, 0, 1280, 720, { fill: C.dark, line: false })
  box(slide, 0, 0, 1280, 720, { fill: '#15251F', line: false })
  pill(slide, 'офлайн · 2×45 минут · есть версия на 30 минут', 64, 58, 440, '#243F35', '#C9F2DD')
  text(slide, 'Цифровизация и маркетинг детейлинга / СТО', 64, 150, 900, 130, { fill: '#15251F', size: 48, bold: true, color: C.white })
  text(slide, 'Как перестать терять заявки, клиентов и повторные продажи — и начать вести бизнес через КарПас CRM.', 64, 300, 760, 120, { fill: '#15251F', size: 30, color: '#DDE7E1' })
  box(slide, 840, 130, 300, 300, { round: true, fill: C.green, stroke: C.green })
  text(slide, 'КарПас\nCRM', 880, 198, 220, 110, { fill: C.green, size: 44, bold: true, color: C.white, align: 'center' })
  text(slide, 'carpasss.ru', 890, 320, 200, 34, { fill: C.green, size: 24, bold: true, color: '#DFF2E7', align: 'center' })
  text(slide, 'Цель выступления: не “рассказать про программу”, а показать владельцу, где он уже теряет деньги и как быстро закрыть эти потери.', 64, 572, 980, 70, { fill: '#15251F', size: 23, color: '#DDE7E1' })
  notes(slide, 'Открытие. Представиться: 15 лет в маркетинге, своя система КарПас. Сразу задать тон: это практичная встреча, а не лекция про IT. Для 30-минутной версии пройти этот слайд за 2-3 минуты.')
  return slide
}
