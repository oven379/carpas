export function makeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

/** Тестовый детейлинг: вход qa@car.local / 1111 — 10 авто с историей и фото (добавляется при первом запуске репозитория). */
export const QA_DETAILING_ID = 'det_qa'
export const QA_DETAILING_EMAIL = 'qa@car.local'

export function seedCars() {
  const now = new Date().toISOString()
  return [
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'WDDUG8DB0LA000001',
      plate: 'A777AA',
      plateRegion: '77',
      make: 'Mercedes-Benz',
      model: 'S 580 4MATIC',
      year: 2022,
      mileageKm: 18400,
      priceRub: 16700000,
      color: 'Obsidian Black',
      city: 'Москва',
      segment: 'premium',
      seller: { name: 'Демо-детейлинг', type: 'service' },
      createdAt: now,
      updatedAt: now,
      hero:
        'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1400&q=80',
    },
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'WP0AB2A90NS000002',
      plate: 'M001MM',
      plateRegion: '77',
      make: 'Porsche',
      model: '911 Turbo S',
      year: 2021,
      mileageKm: 9600,
      priceRub: 23500000,
      color: 'Chalk',
      city: 'Санкт‑Петербург',
      segment: 'premium',
      seller: { name: 'Демо-детейлинг', type: 'service' },
      createdAt: now,
      updatedAt: now,
      hero:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    },
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'ZHWUG1ZD1NLA00003',
      plate: 'K888KK',
      plateRegion: '99',
      make: 'Lamborghini',
      model: 'Urus',
      year: 2023,
      mileageKm: 4200,
      priceRub: 36500000,
      color: 'Verde Mantis',
      city: 'Казань',
      segment: 'premium',
      seller: { name: 'Демо-детейлинг', type: 'service' },
      createdAt: now,
      updatedAt: now,
      hero:
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
    },
  ]
}

export function seedEvents(carId) {
  const base = new Date()
  const iso = (d) => d.toISOString()
  const d1 = new Date(base.getTime() - 1000 * 60 * 60 * 24 * 120)
  const d2 = new Date(base.getTime() - 1000 * 60 * 60 * 24 * 40)
  return [
    {
      id: makeId('evt'),
      detailingId: 'det_seed',
      carId,
      at: iso(d1),
      type: 'visit',
      title: 'Мойка + осмотр',
      mileageKm: 12500,
      services: ['Мойка', 'Осмотр ЛКП'],
      maintenanceServices: [],
      note: 'Зафиксировали мелкие сколы на капоте. Рекомендована полировка.',
    },
    {
      id: makeId('evt'),
      detailingId: 'det_seed',
      carId,
      at: iso(d2),
      type: 'visit',
      title: 'Детейлинг',
      mileageKm: 17100,
      services: ['Полировка', 'Керамика'],
      maintenanceServices: [],
      note: 'Выполнено: полировка + керамика. Фото в документах.',
    },
  ]
}

const u = (id, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

/**
 * Пакет для регрессии кабинета детейлинга: отдельная организация, 10 авто, визиты с услугами из справочников, фото в документах.
 */
export function buildQaDetailingPack() {
  const t = Date.now()
  const atDays = (d) => new Date(t - d * 86400000).toISOString()
  const created = atDays(1)

  const detailing = {
    id: QA_DETAILING_ID,
    name: 'Тест‑студия КарПас',
    email: QA_DETAILING_EMAIL,
    password: '1111',
    pin: '1111',
    contactName: 'Отдел тестирования',
    phone: '+79990001122',
    city: 'Москва',
    address: 'Нагатинская наб., 1 (тестовый адрес)',
    workingHours: 'Пн–Сб 9:00–21:00, вс — выходной',
    description:
      'Автоматически созданный набор из 10 автомобилей с разной историей обслуживания и фото работ — для проверки кабинета и публичного лендинга.',
    website: 'https://example.com',
    telegram: '@car_pas_qa',
    instagram: '@car_pas_qa',
    logo: u('photo-1619405399517-d7fce0f13302', 400),
    cover: u('photo-1486262715619-67b85e0b08d3', 1600),
    servicesOffered: [
      'Мойка кузова',
      'Деликатная мойка (2‑фазная)',
      'Осмотр ЛКП',
      'Полировка (1‑шаг)',
      'Полировка (2‑шаг)',
      'Керамика',
      'Химчистка салона',
      'Оклейка зон риска (PPF)',
      'Замена масла ДВС',
      'Замена передних колодок',
      'Развал‑схождение',
      'Заправка кондиционера',
    ],
    detailingServicesOffered: [
      'Мойка кузова',
      'Деликатная мойка (2‑фазная)',
      'Осмотр ЛКП',
      'Полировка (1‑шаг)',
      'Полировка (2‑шаг)',
      'Керамика',
      'Химчистка салона',
      'Оклейка зон риска (PPF)',
    ],
    maintenanceServicesOffered: [
      'Замена масла ДВС',
      'Замена передних колодок',
      'Развал‑схождение',
      'Заправка кондиционера',
    ],
    profileCompleted: true,
    createdAt: created,
  }

  const carDefs = [
    {
      id: 'car_qa_01',
      vin: 'WBA7B81040G000001',
      plate: 'T001TT',
      plateRegion: '77',
      make: 'BMW',
      model: '740i',
      year: 2021,
      baseKm: 42000,
      city: 'Москва',
      color: 'Чёрный',
      priceRub: 8900000,
      segment: 'premium',
      hero: u('photo-1555215695-3004980ad54e'),
    },
    {
      id: 'car_qa_02',
      vin: 'WAUZZZ4G5DN000002',
      plate: 'A002AA',
      plateRegion: '78',
      make: 'Audi',
      model: 'A6',
      year: 2020,
      baseKm: 68000,
      city: 'Санкт‑Петербург',
      color: 'Серый',
      priceRub: 4100000,
      segment: 'mass',
      hero: u('photo-1606664515524-ed2f786a0bd6'),
    },
    {
      id: 'car_qa_03',
      vin: 'JTDBU4EE0B3000003',
      plate: 'K003KK',
      plateRegion: '124',
      make: 'Toyota',
      model: 'Camry',
      year: 2019,
      baseKm: 95000,
      city: 'Красноярск',
      color: 'Белый',
      priceRub: 2200000,
      segment: 'mass',
      hero: u('photo-1621007947382-bb3c3994e3fb'),
    },
    {
      id: 'car_qa_04',
      vin: 'WVWZZZ1JZ3W000004',
      plate: 'E004EE',
      plateRegion: '96',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2018,
      baseKm: 112000,
      city: 'Екатеринбург',
      color: 'Синий',
      priceRub: 1650000,
      segment: 'mass',
      hero: u('photo-1533473359331-0135ef1b58bf'),
    },
    {
      id: 'car_qa_05',
      vin: 'KNAEK5A80P6000005',
      plate: 'H005HH',
      plateRegion: '152',
      make: 'Kia',
      model: 'EV6',
      year: 2023,
      baseKm: 12000,
      city: 'Нижний Новгород',
      color: 'Зелёный',
      priceRub: 5200000,
      segment: 'mass',
      hero: u('photo-1593941707882-a5bba14938c7'),
    },
    {
      id: 'car_qa_06',
      vin: 'XTA219110G0000006',
      plate: 'M006MM',
      plateRegion: '71',
      make: 'Lada',
      model: 'Vesta',
      year: 2022,
      baseKm: 28000,
      city: 'Тула',
      color: 'Красный',
      priceRub: 1450000,
      segment: 'mass',
      hero: u('photo-1583121274602-3e2820c69888'),
    },
    {
      id: 'car_qa_07',
      vin: '1FA6P8CF0F5000007',
      plate: 'P007PP',
      plateRegion: '23',
      make: 'Ford',
      model: 'Mustang',
      year: 2017,
      baseKm: 78000,
      city: 'Сочи',
      color: 'Жёлтый',
      priceRub: 3500000,
      segment: 'mass',
      hero: u('photo-1584345604472-19c65333a88d'),
    },
    {
      id: 'car_qa_08',
      vin: 'SALWA2RE5MA000008',
      plate: 'B008BB',
      plateRegion: '50',
      make: 'Land Rover',
      model: 'Range Rover',
      year: 2022,
      baseKm: 31000,
      city: 'Москва',
      color: 'Белый',
      priceRub: 12500000,
      segment: 'premium',
      hero: u('photo-1519641471654-76ce0107ad1b'),
    },
    {
      id: 'car_qa_09',
      vin: '5YJ3E1EA1KF000009',
      plate: 'C009CC',
      plateRegion: '99',
      make: 'Tesla',
      model: 'Model Y',
      year: 2023,
      baseKm: 8000,
      city: 'Казань',
      color: 'Серый',
      priceRub: 6800000,
      segment: 'mass',
      hero: u('photo-1560958089-b8a1929cea89'),
    },
    {
      id: 'car_qa_10',
      vin: 'W1K2230811A000010',
      plate: 'Y010YY',
      plateRegion: '77',
      make: 'Mercedes-Benz',
      model: 'E 200',
      year: 2020,
      baseKm: 72000,
      city: 'Москва',
      color: 'Серебристый',
      priceRub: 4800000,
      segment: 'mass',
      hero: u('photo-1618843479313-40f8afb4b4d8'),
    },
  ]

  const cars = carDefs.map((c) => ({
    id: c.id,
    detailingId: QA_DETAILING_ID,
    vin: c.vin,
    plate: c.plate,
    plateRegion: c.plateRegion,
    make: c.make,
    model: c.model,
    year: c.year,
    mileageKm: c.baseKm,
    priceRub: c.priceRub,
    color: c.color,
    city: c.city,
    segment: c.segment,
    seller: { id: QA_DETAILING_ID, name: detailing.name, type: 'service' },
    ownerEmail: null,
    createdAt: created,
    updatedAt: created,
    hero: c.hero,
  }))

  const eventPlans = [
    [
      {
        id: 'evt_qa_01a',
        days: 95,
        title: 'Комплексная мойка',
        km: 40100,
        sv: ['Мойка кузова', 'Чистка дисков', 'Чернение резины'],
        note: 'Подготовка к осмотру ЛКП.',
      },
      {
        id: 'evt_qa_01b',
        days: 62,
        title: 'Кузов и защита',
        km: 40800,
        sv: ['Осмотр ЛКП', 'Полировка (2‑шаг)', 'Керамика'],
        note: 'Фото до/после в материалах.',
        doc: u('photo-1601362840469-51e4d91d59ae', 1200),
      },
      {
        id: 'evt_qa_01c',
        days: 4,
        title: 'Поддержка покрытия',
        km: 41800,
        sv: ['Деликатная мойка (2‑фазная)', 'Воск/синтетика'],
        note: 'Контрольный визит.',
        doc: u('photo-1507136566001-288a1274b09c', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_02a',
        days: 88,
        title: 'Салон',
        km: 66500,
        sv: ['Пылесос салона', 'Химчистка салона'],
        note: 'Сильные загрязнения на заднем ряду.',
      },
      {
        id: 'evt_qa_02b',
        days: 40,
        title: 'Кузов',
        km: 67200,
        sv: ['Антибитум', 'Полировка (1‑шаг)', 'Антидождь'],
        note: '',
        doc: u('photo-1494976388531-d1058494cdd8', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_03a',
        days: 70,
        title: 'ТО и мойка',
        km: 92800,
        sv: ['Мойка кузова', 'Замена масла ДВС', 'Замена масляного фильтра', 'Проверка уровней жидкостей'],
        note: 'Рекомендована замена салонного фильтра.',
      },
      {
        id: 'evt_qa_03b',
        days: 35,
        title: 'Салонный фильтр',
        km: 93500,
        sv: ['Замена салонного фильтра'],
        note: '',
      },
      {
        id: 'evt_qa_03c',
        days: 6,
        title: 'Мойка перед выдачей',
        km: 94800,
        sv: ['Мойка кузова', 'Удаление следов насекомых'],
        note: '',
        doc: u('photo-1449965408861-eb3c13787e87', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_04a',
        days: 110,
        title: 'Диагностика',
        km: 110500,
        sv: ['Диагностика ЭБУ'],
        note: 'Проверка перед поездкой.',
      },
      {
        id: 'evt_qa_04b',
        days: 50,
        title: 'Тормоза',
        km: 111200,
        sv: ['Замена передних колодок', 'Замена тормозной жидкости'],
        note: '',
        doc: u('photo-1489824904134-891ab64532f1', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_05a',
        days: 30,
        title: 'Кондиционер',
        km: 11800,
        sv: ['Заправка кондиционера', 'Чистка / дезинфекция системы'],
        note: '',
        doc: u('photo-1593941707882-a5bba14938c7', 1200),
      },
      {
        id: 'evt_qa_05b',
        days: 9,
        title: 'Быстрая мойка',
        km: 11900,
        sv: ['Мойка кузова'],
        note: '',
      },
    ],
    [
      {
        id: 'evt_qa_06a',
        days: 55,
        title: 'Подвеска',
        km: 26500,
        sv: ['Развал‑схождение', 'Замена стоек стабилизатора'],
        note: '',
      },
      {
        id: 'evt_qa_06b',
        days: 18,
        title: 'Уход',
        km: 27200,
        sv: ['Мойка кузова', 'Уход за пластиком', 'Полировка фар'],
        note: '',
        doc: u('photo-1583121274602-3e2820c69888', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_07a',
        days: 72,
        title: 'Детейлинг',
        km: 75500,
        sv: ['Осмотр ЛКП', 'Удаление царапин локально', 'Полировка стекол'],
        note: '',
      },
      {
        id: 'evt_qa_07b',
        days: 21,
        title: 'Финиш',
        km: 76200,
        sv: ['Чистка стекол', 'Чернение резины'],
        note: '',
        doc: u('photo-1584345604472-19c65333a88d', 1200),
      },
    ],
    [
      {
        id: 'evt_qa_08a',
        days: 44,
        title: 'PPF зоны риска',
        km: 29800,
        sv: ['Оклейка зон риска (PPF)', 'Полировка фар'],
        note: 'Передние крылья и пороги.',
        doc: u('photo-1519641471654-76ce0107ad1b', 1200),
      },
      {
        id: 'evt_qa_08b',
        days: 11,
        title: 'Мойка',
        km: 30500,
        sv: ['Деликатная мойка (2‑фазная)'],
        note: '',
      },
    ],
    [
      {
        id: 'evt_qa_09a',
        days: 25,
        title: 'Салон EV',
        km: 7500,
        sv: ['Пылесос салона', 'Уход за кожей', 'Озонация'],
        note: '',
        doc: u('photo-1560958089-b8a1929cea89', 1200),
      },
      {
        id: 'evt_qa_09b',
        days: 3,
        title: 'Нанесение воска',
        km: 7800,
        sv: ['Мойка кузова', 'Воск/синтетика'],
        note: '',
      },
    ],
    [
      {
        id: 'evt_qa_10a',
        days: 80,
        title: 'Комплекс',
        km: 70500,
        sv: ['Замена масла ДВС', 'Замена воздушного фильтра', 'Мойка кузова'],
        note: '',
      },
      {
        id: 'evt_qa_10b',
        days: 48,
        title: 'Интерьер',
        km: 71200,
        sv: ['Химчистка ковриков', 'Уход за кожей'],
        note: '',
      },
      {
        id: 'evt_qa_10c',
        days: 7,
        title: 'Выдача',
        km: 71800,
        sv: ['Мойка кузова', 'Антизапотевание'],
        note: '',
        doc: u('photo-1618843479313-40f8afb4b4d8', 1200),
      },
    ],
  ]

  const events = []
  const docs = []

  for (let i = 0; i < carDefs.length; i++) {
    const carId = carDefs[i].id
    const plans = eventPlans[i]
    let maxKm = carDefs[i].baseKm
    for (const p of plans) {
      const at = atDays(p.days)
      events.push({
        id: p.id,
        detailingId: QA_DETAILING_ID,
        carId,
        at,
        type: 'visit',
        title: p.title,
        mileageKm: p.km,
        services: p.sv,
        maintenanceServices: [],
        note: p.note,
        source: 'service',
        ownerEmail: null,
        createdAt: at,
        updatedAt: at,
      })
      maxKm = Math.max(maxKm, p.km)
      if (p.doc) {
        docs.push({
          id: `doc_${p.id}`,
          detailingId: QA_DETAILING_ID,
          carId,
          title: 'Фото работы',
          kind: 'photo',
          url: p.doc,
          eventId: p.id,
          createdAt: at,
          source: 'service',
          ownerEmail: null,
        })
      }
    }
    cars[i].mileageKm = maxKm
    cars[i].updatedAt = events.filter((e) => e.carId === carId).sort((a, b) => b.at.localeCompare(a.at))[0]?.at || created
  }

  return { detailing, cars, events, docs }
}
