/**
 * Генерация превью для соцсетей (Open Graph, 1200×630) для каждой статьи блога: public/og/<slug>.jpg.
 *
 * Данные (slug, заголовок, темы) читаются из src/blog/posts.jsx. Тема статьи (теги) определяет подпись и скриншот.
 * Рендер — headless Chrome по HTML-шаблону, сжатие в JPEG — sharp (уже есть в devDependencies).
 * Картинки лежат в git: Chrome нужен только тому, кто добавляет или переименовывает статью.
 *
 * Запуск: npm run og            — только недостающие
 *         npm run og -- --force — перегенерировать все
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'og')
const FORCE = process.argv.includes('--force')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p))

const asset = (name) => 'file://' + path.join(ROOT, 'src', 'assets', name)

/** Тема → подпись и скриншот. Порядок важен: берётся первая тема, чей тег есть у статьи. */
const THEMES = [
  { tag: 'prigon', label: 'Пригон авто', shot: 'app-screen-history-owner.jpg', phone: true },
  { tag: 'voronezh', label: 'Партнёр КарПас · Воронеж', shot: 'partner-nnd.png', phone: false },
  { tag: 'brands', label: 'Сервисная книжка', shot: 'app-screen-car-card.jpg', phone: true },
  { tag: 'crm', label: 'Для автосервиса', shot: 'crm-panel.png', phone: false },
  { tag: 'about', label: 'О КарПас', shot: 'product-overview.png', phone: false },
  { tag: 'servisnaya-knizhka', label: 'Сервисная книжка', shot: 'app-screen-history-list.jpg', phone: true },
  { tag: 'owners', label: 'Владельцам авто', shot: 'app-screen-garage.jpg', phone: true },
]
const DEFAULT_THEME = { label: 'Блог КарПас', shot: 'product-overview.png', phone: false }

function readPosts() {
  const src = fs.readFileSync(path.join(ROOT, 'src/blog/posts.jsx'), 'utf8')
  const tags = {}
  for (const m of src.matchAll(/'([a-z0-9-]+)':\s*\{\s*tags:\s*\[([^\]]*)\]/g)) {
    tags[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }
  const posts = []
  for (const chunk of src.split(/\n\s*slug:\s*'/).slice(1)) {
    const slug = chunk.slice(0, chunk.indexOf("'"))
    const title = /title:\s*'((?:[^'\\]|\\.)*)'/.exec(chunk)?.[1]
    if (slug && title) posts.push({ slug, title: title.replace(/\\'/g, "'"), tags: tags[slug] || [] })
  }
  return posts
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** «Первая часть: вторая часть» — вторая подсвечивается золотом. */
function titleHtml(title) {
  const m = /^(.{12,}?)(:| — )\s*(.+)$/.exec(title)
  return m ? `${esc(m[1])}${esc(m[2].trim() === ':' ? ':' : ' —')} <span class="gold">${esc(m[3])}</span>` : esc(title)
}

function fontSize(title) {
  const n = title.length
  if (n <= 42) return 66
  if (n <= 62) return 58
  if (n <= 80) return 50
  return 44
}

function html({ title, theme }) {
  const visual = theme.phone
    ? `<div class="phone"><img src="${asset(theme.shot)}" alt=""></div>`
    : `<div class="card"><img src="${asset(theme.shot)}" alt=""></div>`
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:1200px;height:630px;overflow:hidden;background:#0b0b0b}
    body{position:relative;font-family:system-ui,-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#f0f0f0}
    .glow{position:absolute;inset:0;background:radial-gradient(900px 520px at 18% 0%,rgba(200,169,110,.20),transparent 62%),radial-gradient(700px 500px at 100% 100%,rgba(200,169,110,.12),transparent 60%)}
    .left{position:absolute;left:64px;top:52px;bottom:52px;width:${theme.phone ? 650 : 600}px;display:flex;flex-direction:column}
    .logo{height:46px;width:auto;align-self:flex-start}
    .chip{margin-top:44px;align-self:flex-start;padding:9px 18px;border:1.5px solid rgba(200,169,110,.7);border-radius:999px;color:#c8a96e;font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
    .title{margin-top:26px;font-weight:800;line-height:1.12;letter-spacing:-.01em;font-size:${fontSize(title)}px;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
    .gold{color:#c8a96e}
    .foot{margin-top:auto;display:flex;align-items:center;gap:16px;font-size:24px;color:#9a9a9a}
    .foot i{display:block;width:64px;height:2px;background:linear-gradient(90deg,#c8a96e,transparent)}
    .phone{position:absolute;right:70px;top:46px;width:272px;height:600px;border-radius:34px;overflow:hidden;border:2px solid rgba(200,169,110,.55);box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 60px rgba(200,169,110,.18)}
    .phone img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
    .card{position:absolute;right:56px;top:150px;width:470px;height:330px;border-radius:20px;overflow:hidden;border:2px solid rgba(200,169,110,.55);box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 60px rgba(200,169,110,.18)}
    .card img{width:100%;height:100%;object-fit:cover;object-position:top left;display:block}
  </style></head><body>
    <div class="glow"></div>
    <div class="left">
      <img class="logo" src="${asset('brand-wordmark.svg')}" alt="">
      <div class="chip">${esc(theme.label)}</div>
      <div class="title">${titleHtml(title)}</div>
      <div class="foot"><i></i>carpasss.ru/blog</div>
    </div>
    ${visual}
  </body></html>`
}

async function main() {
  if (!CHROME) {
    console.error('[og] Chrome/Chromium не найден. Задайте CHROME_PATH.')
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'))
  const posts = readPosts()
  let made = 0
  for (const post of posts) {
    const out = path.join(OUT_DIR, `${post.slug}.jpg`)
    if (!FORCE && fs.existsSync(out)) continue
    const theme = THEMES.find((t) => post.tags.includes(t.tag)) || DEFAULT_THEME
    const htmlFile = path.join(tmp, `${post.slug}.html`)
    const pngFile = path.join(tmp, `${post.slug}.png`)
    fs.writeFileSync(htmlFile, html({ title: post.title, theme }), 'utf8')
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--window-size=1200,630',
        '--virtual-time-budget=4000',
        `--screenshot=${pngFile}`,
        'file://' + htmlFile,
      ],
      { stdio: 'ignore' },
    )
    await sharp(pngFile).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(out)
    made += 1
    console.log(`[og] ✓ ${post.slug}.jpg  (${theme.label})`)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(`[og] готово: создано ${made}, всего статей ${posts.length}`)
}

main()
