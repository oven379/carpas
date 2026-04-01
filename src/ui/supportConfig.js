/**
 * Ссылка «Поддержка» без выпадающего списка (футер, шапка у гостя и партнёра).
 * Переопределение: VITE_SUPPORT_URL в .env
 */
const DEFAULT_SUPPORT_URL = 'https://t.me/manager379team'

export const SUPPORT_LINK_HREF =
  typeof import.meta.env.VITE_SUPPORT_URL === 'string' && import.meta.env.VITE_SUPPORT_URL.trim()
    ? import.meta.env.VITE_SUPPORT_URL.trim()
    : DEFAULT_SUPPORT_URL
