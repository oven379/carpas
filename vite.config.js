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
    /* Capacitor WebView: относительные пути к chunk'ам (иначе /assets/… не грузится после cap sync без --base ./). */
    base: './',
    /* Не подменять import.meta.env.VITE_* — в части сборок это ломает весь import.meta.env */
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || ''),
    },
    plugins: [
      react(),
      {
        name: 'favicon-cache-bust',
        transformIndexHtml(html) {
          const q = `?v=${encodeURIComponent(pkg.version || '0')}`
          return html
            .replace(/href="(\.\/)?favicon\.svg(\?[^"]*)?"/g, `href="$1favicon.svg${q}"`)
            .replace(/href="(\.\/)?favicon-32\.png(\?[^"]*)?"/g, `href="$1favicon-32.png${q}"`)
            .replace(/href="(\.\/)?favicon-16\.png(\?[^"]*)?"/g, `href="$1favicon-16.png${q}"`)
            .replace(/href="(\.\/)?apple-touch-icon\.png(\?[^"]*)?"/g, `href="$1apple-touch-icon.png${q}"`)
        },
      },
    ],
    resolve: {
      alias: {
        '@': aboutLandingRoot,
      },
      /* R3F + react-reconciler: одна копия React, иначе падает ReactCurrentBatchConfig */
      dedupe: ['react', 'react-dom'],
    },
    server: {
      /* true = все интерфейсы; и http://127.0.0.1:5173, и http://localhost:5173 */
      host: true,
      port: 5173,
      /* если 5173 занят — явная ошибка, а не тихий переход на 5174 (и «не открывается» старый URL) */
      strictPort: true,
      proxy: devProxy(proxyTarget),
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: false,
      proxy: devProxy(proxyTarget),
    },
    /* R3F/three/list-of-cars дают крупный vendor; предупреждение 500 kB не значит ошибку сборки */
    build: {
      chunkSizeWarningLimit: 1200,
    },
  }
})
