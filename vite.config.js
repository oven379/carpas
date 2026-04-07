import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const aboutLandingRoot = fileURLToPath(new URL('./src/about-landing', import.meta.url))

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

const devProxy = (proxyTarget) => ({
  '/api': { target: proxyTarget, changeOrigin: true },
  '/storage': { target: proxyTarget, changeOrigin: true },
})

// https://vite.dev/config/
// Прокси /api и /storage → Docker nginx (по умолчанию :8088). Иначе с :5173 «Failed to fetch» / 404.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = String(
    process.env.VITE_DEV_PROXY_TARGET || env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8088',
  ).replace(/\/+$/, '')

  return {
    /* Не подменять import.meta.env.VITE_* — в части сборок это ломает весь import.meta.env */
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || ''),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': aboutLandingRoot,
      },
      /* R3F + react-reconciler: одна копия React, иначе падает ReactCurrentBatchConfig */
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: devProxy(proxyTarget),
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: false,
      proxy: devProxy(proxyTarget),
    },
  }
})
