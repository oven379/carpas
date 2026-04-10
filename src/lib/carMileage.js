/**
 * Единая логика пробега: отображение и нижняя граница в полях ввода.
 * Нельзя указать пробег меньше максимума из карточки и финальных визитов;
 * при редактировании визита учитывается и его текущее сохранённое значение.
 */

export function parseEventMileageKm(raw) {
  if (raw == null || raw === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/**
 * Пробег для отображения в списках и на карточке: max(карточка, все финальные визиты).
 */
export function resolveEffectiveMileageKm(car, events) {
  return resolveMinMileageKmForVisitForm(car, events, null)
}

/**
 * Минимально допустимый пробег в форме визита.
 * @param {object|null} car
 * @param {Array} events — события карточки (как в state HistoryPage)
 * @param {string|null|undefined} editingEventId — id редактируемого визита или null для нового
 */
export function resolveMinMileageKmForVisitForm(car, events, editingEventId) {
  const carKm = parseEventMileageKm(car?.mileageKm)
  const finalized = (events || []).filter((e) => e && !e.isDraft)
  let maxOther = 0
  for (const e of finalized) {
    if (editingEventId != null && String(e.id) === String(editingEventId)) continue
    const mk = parseEventMileageKm(e.mileageKm)
    if (mk > maxOther) maxOther = mk
  }
  let selfKm = 0
  if (editingEventId != null) {
    const self = finalized.find((e) => String(e.id) === String(editingEventId))
    selfKm = self ? parseEventMileageKm(self.mileageKm) : 0
  }
  return Math.max(carKm, maxOther, selfKm)
}
