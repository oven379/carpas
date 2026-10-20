/**
 * Генерация dist/sitemap.xml из единого списка маршрутов (scripts/routes.mjs) с честным <lastmod>.
 *
 * lastmod:
 *  - статьи блога — datePublished из src/blog/posts.jsx;
 *  - остальные страницы — дата последнего git-коммита файлов страницы (если git доступен), иначе поле не пишется.
 * Запуск: node scripts/generate-sitemap.mjs (после vite build). Если dist/ нет — тихо пропускает.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ROUTES } from './routes.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ORIGIN = (process.env.VITE_SITE_ORIGIN || 'https://carpasss.ru').replace(/\/+$/, '')

/** Даты статей: для каждого `slug: '…'` берём ближайший следующий `datePublished: '…'`. */
function blogDates() {
  const src = fs.readFileSync(path.join(ROOT, 'src/blog/posts.jsx'), 'utf8')
  const dates = {}
  const re = /slug:\s*'([^']+)'[\s\S]*?datePublished:\s*'(\d{4}-\d{2}-\d{2})'/g
  let m
  while ((m = re.exec(src))) dates[m[1]] = m[2]
  return dates
}

function gitDate(files) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null
  } catch {
    return null
  }
}

const PAGE_SOURCES = {
  '/': ['src/ui/pages/HomePage.jsx'],
  '/owners': ['src/about-landing/AboutLanding.tsx', 'src/ui/pages/OwnersPage.jsx'],
  '/business': ['src/ui/pages/BusinessSeoPage.jsx'],
}
const GEO_SOURCES = ['src/ui/pages/BusinessGeoPage.jsx', 'src/ui/pages/businessCities.js']

function meta(route) {
  if (route === '/') return { changefreq: 'weekly', priority: '1.0' }
  if (route === '/owners' || route === '/business') return { changefreq: 'weekly', priority: '0.9' }
  if (route === '/blog') return { changefreq: 'weekly', priority: '0.5' }
  if (route.startsWith('/business/')) return { changefreq: 'monthly', priority: '0.7' }
  return { changefreq: 'monthly', priority: '0.6' }
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.warn('[sitemap] dist/ не найден — пропуск.')
    return
  }
  const posts = blogDates()
  const newestPost = Object.values(posts).sort().pop() || null

  const urls = ROUTES.map((route) => {
    let lastmod = null
    if (route.startsWith('/blog/')) lastmod = posts[route.slice('/blog/'.length)] || null
    else if (route === '/blog') lastmod = newestPost
    else if (route.startsWith('/business/')) lastmod = gitDate(GEO_SOURCES)
    else if (PAGE_SOURCES[route]) lastmod = gitDate(PAGE_SOURCES[route])
    const { changefreq, priority } = meta(route)
    return { loc: `${ORIGIN}${route === '/' ? '/' : route}`, lastmod, changefreq, priority }
  })

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
          `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join('\n') +
    '\n</urlset>\n'

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8')
  try {
    // Копия в public/ (она лежит в git): ручной vite build без этого скрипта всё равно отдаст актуальный sitemap.
    fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml, 'utf8')
  } catch {
    /* public/ только для чтения на сервере сборки — не критично */
  }
  const withDate = urls.filter((u) => u.lastmod).length
  console.log(`[sitemap] ✓ dist/sitemap.xml: ${urls.length} URL, lastmod у ${withDate}`)
}

main()
