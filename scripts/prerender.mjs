/**
 * Пре-рендер маркетинговых страниц SPA в статический HTML для SEO.
 *
 * Зачем: сайт — SPA, краулеры (особенно Яндекс) видят пустой <div id="root">.
 * Скрипт снимает готовый DOM (контент + <title>/description/canonical/OG + JSON-LD)
 * и кладёт его в dist/<route>/index.html, чтобы поисковики получали полноценную страницу.
 *
 * Запуск: node scripts/prerender.mjs (после `vite build`).
 * Нужен установленный Chrome/Chromium. Путь можно задать переменной CHROME_PATH.
 * Если браузер не найден — скрипт МЯГКО пропускает пре-рендер (сборка не падает).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ROUTES = ['/', '/about', '/business']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

/** Статик-сервер dist/ с SPA-фолбэком и заглушкой API (чтобы не было reload-лупа при пре-рендере). */
function startServer(port, indexHtml) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    // заглушки, чтобы BackendHealthCheck не перезагружал страницу
    if (url === '/health' || url === '/api/health' || url.startsWith('/api/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
      return
    }
    const filePath = path.join(DIST, url)
    if (url !== '/' && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
      return
    }
    // SPA-фолбэк: всегда исходный index.html (не перезаписанный снимок)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(indexHtml)
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}

/** Минимальный CDP-клиент поверх глобального WebSocket (Node 22+). */
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = (e) => rej(new Error('WS error: ' + (e?.message || 'unknown')))
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const mid = ++id
      pending.set(mid, { resolve, reject })
      ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  return { ws, send }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function prerenderRoute(cdp, baseUrl, route) {
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.navigate', { url: baseUrl + route }, sessionId)

  // ждём, пока приложение отрендерит контент и SEO-компонент проставит canonical
  const ready = `(() => {
    const root = document.getElementById('root');
    const txt = root ? (root.innerText || '').trim().length : 0;
    const canon = !!document.querySelector('link[rel="canonical"]');
    return txt > 150 && canon;
  })()`
  let ok = false
  for (let i = 0; i < 60; i++) {
    await sleep(250)
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: ready, returnByValue: true }, sessionId)
      if (r.result?.value) {
        ok = true
        break
      }
    } catch {
      /* target ещё грузится */
    }
  }
  // форсируем видимость анимируемых секций (framer-motion initial opacity:0)
  await cdp.send(
    'Runtime.evaluate',
    {
      expression: `(() => { const s=document.createElement('style'); s.textContent='.aboutLanding section{opacity:1!important;transform:none!important}'; document.head.appendChild(s); })()`,
    },
    sessionId,
  )
  await sleep(150)
  const html = await cdp.send(
    'Runtime.evaluate',
    { expression: `'<!doctype html>\\n' + document.documentElement.outerHTML`, returnByValue: true },
    sessionId,
  )
  await cdp.send('Target.closeTarget', { targetId: target.targetId })
  return { ok, html: html.result?.value || '' }
}

function outFile(route) {
  if (route === '/') return path.join(DIST, 'index.html')
  return path.join(DIST, route.replace(/^\//, ''), 'index.html')
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html не найден — сначала `vite build`. Пропуск.')
    return
  }
  const chrome = findChrome()
  if (!chrome) {
    console.warn(
      '[prerender] Chrome/Chromium не найден — пре-рендер пропущен (сборка не падает).\n' +
        '            Установите Chrome или задайте CHROME_PATH, либо соберите локально и выложите dist/.',
    )
    return
  }

  const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const port = await freePort()
  const server = await startServer(port, indexHtml)
  const baseUrl = `http://127.0.0.1:${port}`

  const userDataDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'prerender-'))
  const chromeProc = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )

  // из stderr Chrome выводит "DevTools listening on ws://..."
  const wsUrl = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Chrome не отдал DevTools ws за 15с')), 15000)
    chromeProc.stderr.on('data', (d) => {
      const m = /ws:\/\/[^\s]+/.exec(d.toString())
      if (m) {
        clearTimeout(t)
        resolve(m[0])
      }
    })
    chromeProc.on('exit', () => reject(new Error('Chrome завершился до старта')))
  })

  let cdp
  try {
    cdp = await cdpConnect(wsUrl)
    const results = []
    for (const route of ROUTES) {
      const { ok, html } = await prerenderRoute(cdp, baseUrl, route)
      results.push({ route, ok, len: html.length, html })
    }
    // пишем снимки только после захвата всех маршрутов
    for (const r of results) {
      if (!r.ok || r.len < 500) {
        console.warn(`[prerender] ${r.route}: контент не готов (len=${r.len}) — пропуск`)
        continue
      }
      const file = outFile(r.route)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, r.html, 'utf8')
      console.log(`[prerender] ✓ ${r.route} → ${path.relative(ROOT, file)} (${r.len} байт)`)
    }
  } finally {
    cdp?.ws?.close()
    chromeProc.kill('SIGKILL')
    server.close()
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  // пре-рендер — прогрессивное улучшение: не валим сборку
  console.warn('[prerender] пропущено из-за ошибки:', e.message)
})
