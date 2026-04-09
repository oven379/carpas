/** Текст по умолчанию, если детейлинг не оставил свой совет в последнем визите. */
export const DEFAULT_DETAILING_CARE_ADVICE =
  'Любите свою машину, и она будет любить вас. Остальное сделает КарПас.'

/**
 * Собирает сохранённые careTips (важно + строки советов) в один текст для формы редактирования.
 */
export function mergeStoredCareTipsToPlainText(ct) {
  if (!ct || typeof ct !== 'object') return ''
  const imp = String(ct.important || '').trim()
  const tipsRaw = Array.isArray(ct.tips) ? ct.tips : []
  const tipsParts = tipsRaw.map((t) => String(t || '').trim()).filter(Boolean)
  return [imp, ...tipsParts].filter(Boolean).join('\n\n')
}

/**
 * Один совет владельцу из последнего визита детейлинга (source === 'service').
 * Пустые поля в записи → DEFAULT_DETAILING_CARE_ADVICE.
 * Возвращает массив из одного элемента для совместимости с карточкой авто (выпадающий блок).
 */
export function getCareRecommendations({ car: _car, events }) {
  void _car
  const evts = Array.isArray(events) ? events.filter((e) => !e?.isDraft).slice() : []
  evts.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  const lastService = evts.find((e) => e.source === 'service')

  if (!lastService) {
    return [{ tone: 'neutral', title: DEFAULT_DETAILING_CARE_ADVICE, why: '' }]
  }

  const merged = mergeStoredCareTipsToPlainText(lastService.careTips).trim()
  const title = merged || DEFAULT_DETAILING_CARE_ADVICE

  return [{ tone: 'neutral', title, why: '' }]
}
