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

export const BUSINESS_TYPE_KEYS = BUSINESS_TYPES.map((t) => t.key)
export const DEFAULT_BUSINESS_TYPE = 'detailing'

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
