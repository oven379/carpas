export function makeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

export function seedCars() {
  const now = new Date().toISOString()
  return [
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'WDDUG8DB0LA000001',
      plate: 'A777AA77',
      make: 'Mercedes-Benz',
      model: 'S 580 4MATIC',
      year: 2022,
      mileageKm: 18400,
      priceRub: 16700000,
      color: 'Obsidian Black',
      city: 'Москва',
      segment: 'premium',
      seller: { name: 'Not. Moiko.', type: 'service' },
      createdAt: now,
      updatedAt: now,
      hero:
        'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1400&q=80',
    },
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'WP0AB2A90NS000002',
      plate: 'M001MM77',
      make: 'Porsche',
      model: '911 Turbo S',
      year: 2021,
      mileageKm: 9600,
      priceRub: 23500000,
      color: 'Chalk',
      city: 'Санкт‑Петербург',
      segment: 'premium',
      seller: { name: 'Not. Moiko.', type: 'service' },
      createdAt: now,
      updatedAt: now,
      hero:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    },
    {
      id: makeId('car'),
      detailingId: 'det_seed',
      vin: 'ZHWUG1ZD1NLA00003',
      plate: 'K888KK99',
      make: 'Lamborghini',
      model: 'Urus',
      year: 2023,
      mileageKm: 4200,
      priceRub: 36500000,
      color: 'Verde Mantis',
      city: 'Казань',
      segment: 'premium',
      seller: { name: 'Not. Moiko.', type: 'service' },
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
      note: 'Выполнено: полировка + керамика. Фото в документах.',
    },
  ]
}

