import { fmtDate } from './format.js'

/**
 * Текст под кнопкой «Поделиться историей»: что осталось до доступности ссылки.
 * Правило считает бэкенд (ShareEligibility); здесь только формулировка для пользователя.
 * @param {{ eligible?: boolean, visits?: number, requiredVisits?: number, requiredMonths?: number, eligibleSince?: string|null }} e
 */
export function shareEligibilityHint(e) {
  const need = Number(e?.requiredVisits) || 6
  const months = Number(e?.requiredMonths) || 3
  const visits = Math.max(0, Number(e?.visits) || 0)
  if (e?.eligible) return ''
  const monthsPart = e?.eligibleSince
    ? `или с ${fmtDate(e.eligibleSince)}, когда истории исполнится ${months} месяца`
    : `или через ${months} месяца после первой записи`
  return `Ссылка станет доступна после ${need} ваших визитов ${monthsPart}. Сейчас визитов: ${visits} из ${need}.`
}
