/** Если детейлинг не заполнил «Важно» — показываем на карточке этот текст (последний визит от сервиса). */
export const DEFAULT_DETAILING_CARE_IMPORTANT =
  'Первые сутки не мойте под высоким давлением и не натирайте ЛКП сухой тряпкой. Вопросы — сервису.'

/** Если все три поля «Совет» пусты — объединяем в одну плашку «Совет» на карточке авто. */
export const DEFAULT_DETAILING_CARE_TIPS = [
  'После мойки промакивайте стёкла мягкой тканью — меньше разводов.',
  'Пыль с кузова сдуйте или сметайте щёткой; сухая тряпка без воды даёт микроцарапины.',
]

/**
 * Ровно две плашки на странице авто: «Важно» и «Совет» из последнего визита детейлинга (source === 'service').
 * Пустое «Важно» → дефолт; пустые три строки «Совет» → один текст из двух дефолтных фраз.
 * Если детейлинг заполнил строки советов — показываем их все в одной плашке «Совет» (через пустую строку).
 */
export function getCareRecommendations({ car: _car, events }) {
  void _car
  const evts = Array.isArray(events) ? events.filter((e) => !e?.isDraft).slice() : []
  evts.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  const lastService = evts.find((e) => e.source === 'service')

  const importantDefault = DEFAULT_DETAILING_CARE_IMPORTANT
  const tipsDefaultText = DEFAULT_DETAILING_CARE_TIPS.join('\n\n')

  if (!lastService) {
    return [
      { tone: 'accent', title: importantDefault, why: '' },
      { tone: 'neutral', title: tipsDefaultText, why: '' },
    ]
  }

  const ct = lastService.careTips && typeof lastService.careTips === 'object' ? lastService.careTips : null
  const importantCustom = ct ? String(ct.important || '').trim() : ''
  const tipsRaw = ct && Array.isArray(ct.tips) ? ct.tips : []
  const tipsCustom = [0, 1, 2].map((i) => String(tipsRaw[i] || '').trim()).filter(Boolean)

  const important = importantCustom || importantDefault
  const advice = tipsCustom.length > 0 ? tipsCustom.join('\n\n') : tipsDefaultText

  return [
    { tone: 'accent', title: important, why: '' },
    { tone: 'neutral', title: advice, why: '' },
  ]
}
