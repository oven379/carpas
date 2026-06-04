import { C, header, footer, box, text, notes } from './common.mjs'

export async function slide03(presentation) {
  const slide = presentation.slides.add()
  header(slide, 'Мини-аудит: 10 вопросов к владельцу или управляющему', 'практика')
  const questions = [
    'Все заявки попадают в одну систему?',
    'Есть карточка клиента и автомобиля?',
    'Видно, кто ответственный за клиента?',
    'Фиксируется история визитов и фото?',
    'Есть дата следующего контакта?',
    'Можно найти клиента по телефону, VIN или номеру?',
    'Понятно, какие клиенты давно не были?',
    'Отзывы собираются после выдачи авто?',
    'Есть публичная страница сервиса?',
    'Можно быстро подключить нового клиента к истории авто?',
  ]
  questions.forEach((q, i) => {
    const col = i < 5 ? 0 : 1
    const row = i % 5
    const y = 192 + row * 78
    box(slide, 82 + col * 560, y, 34, 34, { fill: C.white, stroke: C.green, lineWidth: 2 })
    text(slide, q, 132 + col * 560, y - 3, 460, 44, { size: 22 })
  })
  box(slide, 64, 610, 1070, 50, { round: true, fill: C.amber2, stroke: C.amber2, text: 'Если 4+ пунктов не выполняются, бизнес уже теряет деньги в управлении и маркетинге.', size: 24, bold: true, color: '#6A4A09', align: 'center' })
  footer(slide, 3)
  notes(slide, 'Это интерактив на 5-7 минут в большой версии. В 30-минутной версии попросить участников просто посчитать ответы “нет” в голове. Финальная фраза подводит к ценности CRM без прямой продажи.')
  return slide
}
