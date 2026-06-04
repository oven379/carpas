import { C, box, text, pill, notes } from './common.mjs'

export async function slide14(presentation) {
  const slide = presentation.slides.add()
  box(slide, 0, 0, 1280, 720, { fill: C.dark, line: false })
  pill(slide, 'следующий шаг', 64, 58, 190, '#243F35', '#C9F2DD')
  text(slide, 'Подключите КарПас CRM\nи заведите первых клиентов', 64, 132, 660, 126, { fill: C.dark, size: 41, bold: true, color: C.white })
  text(slide, 'Сейчас доступ к текущему функционалу на этапе запуска бесплатный. Начните с заявки партнера, а после подтверждения настройте публичную страницу и кабинет сервиса.', 64, 292, 640, 116, { fill: C.dark, size: 25, color: '#DDE7E1' })
  box(slide, 850, 116, 300, 300, { round: true, fill: C.white, stroke: C.white })
  box(slide, 888, 154, 224, 224, { fill: '#F1F4EF', stroke: C.line })
  text(slide, 'QR\ncarpasss.ru', 914, 220, 172, 92, { fill: '#F1F4EF', size: 34, bold: true, color: C.green, align: 'center' })
  text(slide, 'Место для настоящего QR-кода', 880, 399, 240, 24, { fill: C.white, size: 16, color: C.muted, align: 'center' })
  box(slide, 64, 520, 720, 62, { round: true, fill: C.green, stroke: C.green, text: 'carpasss.ru', size: 34, bold: true, color: C.white, align: 'center' })
  text(slide, 'Финальная фраза: “Цифровизация начинается не с большой стратегии, а с первого клиента, которого вы перестали терять”.', 64, 620, 920, 46, { fill: C.dark, size: 22, color: '#DDE7E1' })
  notes(slide, 'Финал. Попросить открыть QR или сайт. Объяснить подключение: заявка, подтверждение через админ-панель, логин и пароль на почту, настройка лендинга и кабинета. Если будет настоящий QR, заменить серый блок на изображение.')
  return slide
}
