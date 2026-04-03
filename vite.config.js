import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Явный порт и listen на всех интерфейсах: реже ломается связка localhost/IPv6 и проще открыть по 127.0.0.1
  // (в Яндекс.Браузере «404 Яндекса» на localhost чаще всего значит: dev-сервер не запущен или порт другой).
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
  },
})
