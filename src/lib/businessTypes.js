/**
 * Типы бизнеса партнёра КарПас. Ключ хранится в БД (business_type),
 * подписи и склонения используются в форме регистрации, настройках и на публичном лендинге.
 */
export const BUSINESS_TYPES = [
  { key: 'detailing', label: 'Детейлинг', call: 'детейлинг', seo: 'Детейлинг' },
  { key: 'sto', label: 'СТО', call: 'СТО', seo: 'СТО' },
  { key: 'wash', label: 'Автомойка', call: 'автомойку', seo: 'Автомойка' },
  { key: 'tuning', label: 'Тюнинг-ателье', call: 'тюнинг-ателье', seo: 'Тюнинг-ателье' },
  { key: 'prigon', label: 'Пригон авто', call: 'компанию по пригону авто', seo: 'Пригон авто' },
]


export const DEFAULT_BUSINESS_TYPE = 'detailing'

/** Через сколько дней без визита клиент попадает в фильтр «Давно не были» (по типу бизнеса). */
const STALE_VISIT_DAYS_BY_TYPE = {
  detailing: 19,
  wash: 19,
}
const STALE_VISIT_DAYS_DEFAULT = 25

export function staleVisitDays(key) {
  return STALE_VISIT_DAYS_BY_TYPE[key] ?? STALE_VISIT_DAYS_DEFAULT
}

function findType(key) {
  return BUSINESS_TYPES.find((t) => t.key === key) || BUSINESS_TYPES[0]
}

/** Название типа для списков и админки: «Детейлинг», «Пригон авто»… */
export function businessTypeLabel(key) {
  return findType(key).label
}

/** Форма для «Нажмите, чтобы позвонить в …»: «детейлинг», «автомойку», «компанию по пригону авто». */
export function businessTypeCall(key) {
  return findType(key).call
}

/** Название для SEO-описаний: «{seo} в КарПас». */
export function businessTypeSeo(key) {
  return findType(key).seo
}
