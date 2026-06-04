import { C, header, footer, card, notes } from './common.mjs'

export async function slide08(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Рекламные связки: продавать не услугу, а ситуацию клиента', 'примеры')
  const bundles = [
    ['Перед сезоном', 'керамика · антидождь · полировка стекол'],
    ['После зимы', 'химчистка · восстановление ЛКП · мойка двигателя'],
    ['Перед продажей', 'полировка · химчистка · фотоотчет истории авто'],
    ['Новый автомобиль', 'защитная пленка · керамика · первый уход'],
    ['Перед поездкой', 'диагностика · ТО · проверка ходовой'],
    ['Комфорт', 'шумоизоляция дверей · акустика · уход салона'],
  ]
  bundles.forEach((b, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    card(slide, b[0], b[1], 64 + col * 375, 210 + row * 160, 330, 116, { fill: i % 2 ? C.blue2 : C.green2, stroke: i % 2 ? C.blue2 : C.green2, titleColor: i % 2 ? C.blue : C.green, color: C.ink })
  })
  footer(slide, 8)
  notes(slide, 'Пояснить: эти связки легче продвигать в рекламе, потому что клиент узнает свою ситуацию. В CRM важно сохранить, какая услуга была куплена, чтобы потом предложить следующий логичный шаг.')
  return slide
}
