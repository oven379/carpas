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

export const DETAILING_SERVICES = [
  {
    group: 'Мойка / уход',
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

export const WASH_SERVICE_MARKERS = new Set(
  DETAILING_SERVICES.find((g) => g.group === 'Мойка / уход')?.items || [],
)

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
