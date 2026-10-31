/** Проверяет конечный артефакт, а не только React-исходники. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTES } from './routes.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const origin = (process.env.VITE_SITE_ORIGIN || 'https://carpasss.ru').replace(/\/+$/, '')
const errors = []
const titles = new Set()
const read = (file) => {
  try { return fs.readFileSync(path.join(dist, file), 'utf8') }
  catch { errors.push(`Нет файла ${file}`); return '' }
}
const sitemap = read('sitemap.xml')
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
for (const route of ROUTES) {
  const html = read(route === '/' ? 'index.html' : `${route.slice(1)}/index.html`)
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
  const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)]
  const expected = `${origin}${route}`
  const check = (ok, message) => { if (!ok) errors.push(`${route}: ${message}`) }
  check(title && !titles.has(title), 'нет уникального title')
  titles.add(title)
  check((html.match(/<h1\b/g) || []).length === 1, 'должен быть один H1')
  check(canonical.length === 1 && canonical[0][0].includes(`href="${expected}"`), 'неверный canonical')
  check(/<meta\b[^>]*name="description"[^>]*content="[^"]+"/.test(html), 'нет description')
  check(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html), 'страница закрыта от индексации')
  check(/application\/ld\+json/.test(html), 'нет JSON-LD')
  check(!/<div id="root">\s*<\/div>/.test(html), 'пустой root')
  check(locations.filter((url) => url === expected).length === 1, 'URL отсутствует или повторяется в sitemap')
  check(!html.includes('http://127.0.0.1:'), 'локальный URL попал в HTML')
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    try { JSON.parse(match[1]) } catch { errors.push(`${route}: невалидный JSON-LD`) }
  }
}
if (locations.length !== ROUTES.length) errors.push('Число URL sitemap не совпадает со списком маршрутов')
const shell = read('spa.html')
if (!/<div id="root">\s*<\/div>/.test(shell) || /rel="canonical"/.test(shell)) errors.push('spa.html должен содержать чистый shell без canonical')
if (!read('404.html').includes('noindex')) errors.push('404 должна содержать noindex')
if (!read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`)) errors.push('robots.txt ссылается на другой sitemap')
if (errors.length) {
  console.error('[seo] Проверка не пройдена:\n' + errors.map((e) => `- ${e}`).join('\n'))
  process.exitCode = 1
} else console.log(`[seo] Проверены ${ROUTES.length} страниц, sitemap, robots, SPA shell и 404`)
