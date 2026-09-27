/**
 * Города для гео-страниц бизнеса (/business/<slug>).
 * name — именительный («Москва»), inCity — предложный («в Москве») для текста.
 */
export const businessCities = [
  { slug: 'moskva', name: 'Москва', inCity: 'в Москве' },
  { slug: 'sankt-peterburg', name: 'Санкт-Петербург', inCity: 'в Санкт-Петербурге' },
  { slug: 'ekaterinburg', name: 'Екатеринбург', inCity: 'в Екатеринбурге' },
  { slug: 'novosibirsk', name: 'Новосибирск', inCity: 'в Новосибирске' },
  { slug: 'kazan', name: 'Казань', inCity: 'в Казани' },
  { slug: 'krasnodar', name: 'Краснодар', inCity: 'в Краснодаре' },
  { slug: 'rostov-na-donu', name: 'Ростов-на-Дону', inCity: 'в Ростове-на-Дону' },
  { slug: 'nizhniy-novgorod', name: 'Нижний Новгород', inCity: 'в Нижнем Новгороде' },
]

export function getCityBySlug(slug) {
  return businessCities.find((c) => c.slug === slug) || null
}
