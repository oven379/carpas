import { getApiBaseUrl } from '../api/client.js'

/**
 * Ссылки на мобильные приложения КарПас.
 * iOS — ссылка на App Store.
 * Android — APK отдаётся бэкендом по маршруту /download/android (файл: backend/storage/app/carpas-release.apk).
 */
export const IOS_APP_URL =
  'https://apps.apple.com/ru/app/carpasss-%D0%BA%D0%B0%D1%80%D0%BF%D0%B0%D1%81%D1%81%D1%81/id6768924960'

/** URL для скачивания Android APK (бэкенд-маршрут; базу берём из getApiBaseUrl в момент вызова). */
export function androidApkUrl() {
  return `${getApiBaseUrl()}/download/android`
}
