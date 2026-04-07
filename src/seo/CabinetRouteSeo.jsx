import { useLocation } from 'react-router-dom'
import { Seo } from './Seo.jsx'
import { CABINET_META_DESCRIPTION } from './seoConstants.js'

/**
 * Мета по умолчанию для кабинета, авторизации и служебных маршрутов (noindex).
 * Публичные /, /d/*, /g/*, /share/* задают свой <Seo> на странице.
 */
export function CabinetRouteSeo() {
  const { pathname } = useLocation()

  if (pathname === '/' || pathname === '/about') return null
  if (pathname.startsWith('/admin/')) return null
  if (/^\/d\/[^/]+\/?$/.test(pathname)) return null
  if (/^\/g\/[^/]+\/?$/.test(pathname)) return null
  if (/^\/share\/[^/]+\/?$/.test(pathname)) return null

  let title = 'КарПас'
  if (pathname === '/auth' || pathname === '/auth/') title = 'Вход · КарПас'
  else if (pathname.startsWith('/auth/owner')) title = 'Вход владельца · КарПас'
  else if (pathname.startsWith('/auth/partner/apply')) title = 'Регистрация партнёра · КарПас'
  else if (pathname.startsWith('/auth/partner')) title = 'Вход партнёра · КарПас'
  else if (pathname.startsWith('/cars')) title = 'Мой гараж · КарПас'
  else if (pathname.startsWith('/garage/settings')) title = 'Настройки гаража · КарПас'
  else if (pathname.startsWith('/garage')) title = 'Мой гараж · КарПас'
  else if (pathname.startsWith('/create')) title = 'Добавить автомобиль · КарПас'
  else if (pathname.includes('/history')) title = 'История автомобиля · КарПас'
  else if (pathname.includes('/docs')) title = 'Документы · КарПас'
  else if (pathname.includes('/edit')) title = 'Редактирование автомобиля · КарПас'
  else if (pathname.startsWith('/detailing/landing')) title = 'Настройки лендинга · КарПас'
  else if (pathname.startsWith('/detailing')) title = 'Кабинет сервиса · КарПас'
  else if (pathname.startsWith('/requests')) title = 'Заявки · КарПас'
  else if (pathname.startsWith('/car/')) title = 'Карточка автомобиля · КарПас'

  return <Seo title={title} description={CABINET_META_DESCRIPTION} noindex />
}
