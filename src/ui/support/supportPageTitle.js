const PAGE_TITLE_RULES = [
  [/^\/$/, 'Главная'],
  [/^\/garage\/?$/, 'Гараж'],
  [/^\/garage\/settings/, 'Личный кабинет'],
  [/^\/cars/, 'Автомобили'],
  [/^\/create/, 'Добавление авто'],
  [/^\/car\/[^/]+\/history/, 'История визитов'],
  [/^\/car\/[^/]+\/docs/, 'Документы'],
  [/^\/car\/[^/]+\/edit/, 'Редактирование авто'],
  [/^\/car\/[^/]+/, 'Карточка авто'],
  [/^\/requests/, 'Заявки'],
  [/^\/detailing\/landing/, 'Лендинг партнёра'],
  [/^\/detailing/, 'Кабинет партнёра'],
  [/^\/auth/, 'Вход и регистрация'],
  [/^\/d\//, 'Страница сервиса'],
  [/^\/share\//, 'Публичная история авто'],
]

export function supportPageTitle(pathname) {
  const p = String(pathname || '/')
  for (const [re, title] of PAGE_TITLE_RULES) {
    if (re.test(p)) return title
  }
  return 'Страница сервиса'
}
