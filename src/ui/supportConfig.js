/**
 * Внешняя ссылка «Поддержка» для гостя, партнёра, детейлинга и владельца в футере
 * (кроме страниц /garage и /garage/settings, где в футере — OwnerSupportDropdown).
 * В шапке у авторизованного владельца по-прежнему выпадающее меню.
 * Переопределение: VITE_SUPPORT_URL в .env
 */
const DEFAULT_SUPPORT_URL = 'https://t.me/manager379team'

export const SUPPORT_LINK_HREF =
  typeof import.meta.env.VITE_SUPPORT_URL === 'string' && import.meta.env.VITE_SUPPORT_URL.trim()
    ? import.meta.env.VITE_SUPPORT_URL.trim()
    : DEFAULT_SUPPORT_URL
