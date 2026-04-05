/**
 * Должен совпадать с backend config `app.visit_edit_timezone` (по умолчанию Europe/Moscow).
 */
export const VISIT_EDIT_CALENDAR_TZ = 'Europe/Moscow'

function calendarYmdInTz(isoOrMs, timeZone) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Сервис может править визит только если календарная дата `at` совпадает с «сегодня» в TZ. */
export function isSameCalendarDayAsVisit(visitIsoAt, nowMs = Date.now()) {
  if (!visitIsoAt) return false
  const visitDay = calendarYmdInTz(visitIsoAt, VISIT_EDIT_CALENDAR_TZ)
  const today = calendarYmdInTz(nowMs, VISIT_EDIT_CALENDAR_TZ)
  return Boolean(visitDay && today && visitDay === today)
}

/** Подсказка под заголовком формы, когда визит открыт только на просмотр. */
export function visitReadonlyFormNotice(mode, event) {
  if (!event) return ''
  if (mode === 'owner') {
    if (event.source === 'service') {
      return 'Запись добавлена сервисом. Редактирование недоступно — только просмотр.'
    }
    return 'Редактирование доступно в течение 3 часов с момента последнего сохранения записи.'
  }
  if (mode === 'detailing' && event.source === 'service') {
    return 'Редактирование доступно только в календарный день визита (по московскому времени). Сейчас открыт просмотр.'
  }
  return ''
}
