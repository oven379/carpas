/** Справочники услуг: ТО и детейлинг хранятся в событии отдельными массивами. */

export const MAINTENANCE_SERVICES = [
  {
    group: 'Плановое ТО',
    items: [
      'Замена масла ДВС',
      'Замена масла АКПП',
      'Замена масляного фильтра',
      'Замена воздушного фильтра',
      'Замена салонного фильтра',
      'Замена свечей зажигания',
      'Проверка уровней жидкостей',
    ],
  },
  {
    group: 'Тормозная система',
    items: [
      'Замена передних колодок',
      'Замена задних колодок',
      'Замена тормозной жидкости',
      'Проточка тормозных дисков',
      'Замена тормозных дисков',
    ],
  },
  {
    group: 'Подвеска и рулевое',
    items: [
      'Замена амортизаторов',
      'Замена сайлентблоков',
      'Замена стоек стабилизатора',
      'Развал‑схождение',
      'Замена рулевых наконечников',
    ],
  },
  {
    group: 'Ремни и привод',
    items: [
      'Замена ремня ГРМ',
      'Замена роликов ГРМ',
      'Замена ремня генератора',
      'Замена приводов / ШРУС',
    ],
  },
  {
    group: 'Электрика',
    items: ['Замена АКБ', 'Замена ламп', 'Диагностика ЭБУ'],
  },
  {
    group: 'Кондиционер',
    items: ['Заправка кондиционера', 'Чистка / дезинфекция системы'],
  },
]

/** Группа каталога детейлинга: услуги ухода (в т.ч. мойка) — для splitWashDetailingServices / фото визита */
const CARE_GROUP = 'Уход за кузовом'

export const DETAILING_SERVICES = [
  {
    group: CARE_GROUP,
    items: [
      'Мойка кузова',
      'Деликатная мойка (2‑фазная)',
      'Антибитум',
      'Удаление следов насекомых',
      'Чистка дисков',
      'Чернение резины',
      'Химчистка ковриков',
    ],
  },
  {
    group: 'Салон',
    items: ['Пылесос салона', 'Химчистка салона', 'Озонация', 'Уход за кожей', 'Уход за пластиком'],
  },
  {
    group: 'Кузов',
    items: [
      'Осмотр ЛКП',
      'Полировка (1‑шаг)',
      'Полировка (2‑шаг)',
      'Полировка (3‑шаг)',
      'Керамика',
      'Воск/синтетика',
      'Антидождь',
      'Удаление царапин локально',
    ],
  },
  {
    group: 'Защита',
    items: [
      'Оклейка пленкой (PPF)',
      'Оклейка зон риска (PPF)',
      'Тонировка',
      'Бронирование фар',
    ],
  },
  {
    group: 'Стёкла / оптика',
    items: ['Полировка фар', 'Полировка стекол', 'Чистка стекол', 'Антизапотевание'],
  },
]

function flatItemSet(groups) {
  const s = new Set()
  for (const g of groups) for (const it of g.items || []) s.add(it)
  return s
}

export const MAINTENANCE_ITEM_SET = flatItemSet(MAINTENANCE_SERVICES)
export const DETAILING_ITEM_SET = flatItemSet(DETAILING_SERVICES)

/** Макс. длина названия услуги (каталог или своя строка в профиле). */
export const OFFERED_SERVICE_MAX_LEN = 80

export function dedupeOfferedStrings(arr, maxLen = OFFERED_SERVICE_MAX_LEN) {
  const seen = new Set()
  const out = []
  for (const x of Array.isArray(arr) ? arr : []) {
    const s = String(x || '')
      .trim()
      .slice(0, maxLen)
    if (!s) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

/**
 * Разнести плоский servicesOffered по ведёркам (миграция и legacy API).
 * Позиции только из каталога ТО → в ТО; только из каталога детейлинга → в детейлинг;
 * если строка в обоих (редко) → детейлинг; не из каталога → детейлинг (раньше таких не было).
 */
export function splitOfferedByCatalog(flatList) {
  const det = []
  const maint = []
  for (const s of dedupeOfferedStrings(flatList)) {
    const inD = DETAILING_ITEM_SET.has(s)
    const inM = MAINTENANCE_ITEM_SET.has(s)
    if (inM && !inD) maint.push(s)
    else det.push(s)
  }
  return { detailingServicesOffered: det, maintenanceServicesOffered: maint }
}

export const WASH_SERVICE_MARKERS = new Set(
  DETAILING_SERVICES.find((g) => g.group === CARE_GROUP)?.items || [],
)

export function splitWashDetailingServices(services) {
  const sv = Array.isArray(services) ? services : []
  const wash = sv.filter((s) => WASH_SERVICE_MARKERS.has(s))
  const other = sv.filter((s) => !WASH_SERVICE_MARKERS.has(s))
  return { wash, other }
}

/**
 * Раньше ТО и детейлинг лежали в одном `services`. После разделения: если `maintenanceServices`
 * уже задан — не трогаем; иначе выносим из `services` позиции, совпадающие только с каталогом ТО.
 */
export function splitLegacyCombinedServices(services, maintenanceServices) {
  const sv = Array.isArray(services) ? services : []
  const ms = Array.isArray(maintenanceServices) ? maintenanceServices : []
  if (ms.length > 0) return { services: sv, maintenanceServices: ms }
  const hasMaintOnly = sv.some((s) => MAINTENANCE_ITEM_SET.has(s) && !DETAILING_ITEM_SET.has(s))
  if (!hasMaintOnly) return { services: sv, maintenanceServices: [] }
  const maint = []
  const det = []
  for (const s of sv) {
    if (MAINTENANCE_ITEM_SET.has(s) && !DETAILING_ITEM_SET.has(s)) maint.push(s)
    else det.push(s)
  }
  return { services: det, maintenanceServices: maint }
}

/** Нормализация полей услуг события после загрузки с API: legacy в одном массиве, пустые строки. */
export function normalizeCarEventServices(event) {
  if (!event || typeof event !== 'object') return event
  const rawSvc = Array.isArray(event.services)
    ? event.services.map((s) => String(s || '').trim()).filter(Boolean)
    : []
  const rawMs = Array.isArray(event.maintenanceServices)
    ? event.maintenanceServices.map((s) => String(s || '').trim()).filter(Boolean)
    : []
  const { services, maintenanceServices } = splitLegacyCombinedServices(rawSvc, rawMs)
  return { ...event, services, maintenanceServices }
}
