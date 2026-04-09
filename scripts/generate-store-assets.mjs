/**
 * Растеризует store-assets/source/logo-marketing.svg и создаёт PNG для магазинов, PWA и нативного splash.
 * Запуск: node scripts/generate-store-assets.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'store-assets', 'source', 'logo-marketing.svg')
const faviconSvgPath = path.join(root, 'public', 'favicon.svg')
const rasterSourcePng = path.join(root, 'store-assets', 'source', 'logo-master.png')
const BG = { r: 10, g: 10, b: 11, alpha: 1 }
/** Прозрачный фон для веб-фавиконов и apple-touch (из SVG в public/) */
const BG_TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

function sourceInput() {
  if (fs.existsSync(rasterSourcePng)) {
    return sharp(rasterSourcePng).ensureAlpha()
  }
  return sharp(svgPath, { density: 450 })
}

function rasterSquare(size) {
  return sourceInput()
    .resize(size, size, { fit: 'contain', position: 'centre', background: BG })
    .png()
}

function rasterFeature(w, h) {
  return sourceInput()
    .resize(w, h, { fit: 'contain', position: 'centre', background: BG })
    .png()
}

/**
 * Компактная иконка для Android 12+ SplashScreen API (windowSplashScreenAnimatedIcon).
 * Полноэкранный @drawable/splash здесь нельзя — система маскирует в круг и масштабирует, логотип «вылезает».
 */
async function buildSplashAnimIconPng(innerBox = 152, outer = 288) {
  const mid = await sourceInput()
    .resize(innerBox, innerBox, { fit: 'contain', position: 'centre', background: BG })
    .png()
    .toBuffer()
  const meta = await sharp(mid).metadata()
  const w = meta.width || innerBox
  const h = meta.height || innerBox
  const side = Math.max(w, h, 1)
  const padTop = Math.max(0, Math.floor((side - h) / 2))
  const padBottom = Math.max(0, Math.ceil((side - h) / 2))
  const padLeft = Math.max(0, Math.floor((side - w) / 2))
  const padRight = Math.max(0, Math.ceil((side - w) / 2))
  const squared = await sharp(mid)
    .extend({ top: padTop, bottom: padBottom, left: padLeft, right: padRight, background: BG })
    .png()
    .toBuffer()
  const edge = Math.floor((outer - side) / 2)
  const edgeR = outer - side - edge
  return sharp(squared)
    .extend({ top: edge, bottom: edgeR, left: edge, right: edgeR, background: BG })
    .png()
    .toBuffer()
}

async function writePng(buf, outPath) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await fs.promises.writeFile(outPath, buf)
  console.log('wrote', path.relative(root, outPath))
}

/** Иконка лаунчера Android: до API 26 — полный квадрат с фоном; adaptive foreground — с альфой по краям при необходимости */
async function rasterAndroidLauncherIcon(px, { opaque = true } = {}) {
  const src = fs.existsSync(faviconSvgPath) ? faviconSvgPath : svgPath
  const bg = opaque ? BG : { r: 0, g: 0, b: 0, alpha: 0 }
  return sharp(src, { density: Math.min(480, Math.max(240, px * 2)) })
    .resize(px, px, { fit: 'contain', position: 'centre', background: bg })
    .png()
    .toBuffer()
}

async function main() {
  if (!fs.existsSync(rasterSourcePng) && !fs.existsSync(svgPath)) {
    console.error('Need either', rasterSourcePng, 'or', svgPath)
    process.exit(1)
  }
  if (fs.existsSync(rasterSourcePng)) {
    console.log('Using raster source:', path.relative(root, rasterSourcePng))
  } else {
    console.log('Using vector source:', path.relative(root, svgPath))
  }

  const master1024 = await rasterSquare(1024).toBuffer()
  const resize = (px) => sharp(master1024).resize(px, px, { kernel: sharp.kernel.lanczos3 }).png().toBuffer()

  const iosDir = path.join(root, 'store-assets', 'app-store', 'AppIcon.appiconset')
  const uniqueFiles = [
    ['AppIcon-20.png', 20],
    ['AppIcon-29.png', 29],
    ['AppIcon-40.png', 40],
    ['AppIcon-58.png', 58],
    ['AppIcon-60.png', 60],
    ['AppIcon-76.png', 76],
    ['AppIcon-80.png', 80],
    ['AppIcon-87.png', 87],
    ['AppIcon-120.png', 120],
    ['AppIcon-152.png', 152],
    ['AppIcon-167.png', 167],
    ['AppIcon-180.png', 180],
    ['AppIcon-1024.png', 1024],
  ]

  for (const [name, px] of uniqueFiles) {
    const png = px === 1024 ? master1024 : await resize(px)
    await writePng(png, path.join(iosDir, name))
  }

  const contents = {
    images: [
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-40.png', scale: '2x' },
      { size: '20x20', idiom: 'iphone', filename: 'AppIcon-60.png', scale: '3x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-58.png', scale: '2x' },
      { size: '29x29', idiom: 'iphone', filename: 'AppIcon-87.png', scale: '3x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-80.png', scale: '2x' },
      { size: '40x40', idiom: 'iphone', filename: 'AppIcon-120.png', scale: '3x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-120.png', scale: '2x' },
      { size: '60x60', idiom: 'iphone', filename: 'AppIcon-180.png', scale: '3x' },
      { size: '20x20', idiom: 'ipad', filename: 'AppIcon-20.png', scale: '1x' },
      { size: '20x20', idiom: 'ipad', filename: 'AppIcon-40.png', scale: '2x' },
      { size: '29x29', idiom: 'ipad', filename: 'AppIcon-29.png', scale: '1x' },
      { size: '29x29', idiom: 'ipad', filename: 'AppIcon-58.png', scale: '2x' },
      { size: '40x40', idiom: 'ipad', filename: 'AppIcon-40.png', scale: '1x' },
      { size: '40x40', idiom: 'ipad', filename: 'AppIcon-80.png', scale: '2x' },
      { size: '76x76', idiom: 'ipad', filename: 'AppIcon-76.png', scale: '1x' },
      { size: '76x76', idiom: 'ipad', filename: 'AppIcon-152.png', scale: '2x' },
      { size: '83.5x83.5', idiom: 'ipad', filename: 'AppIcon-167.png', scale: '2x' },
      { size: '1024x1024', idiom: 'ios-marketing', filename: 'AppIcon-1024.png', scale: '1x' },
    ],
    info: { version: 1, author: 'generate-store-assets' },
  }
  await fs.promises.writeFile(path.join(iosDir, 'Contents.json'), JSON.stringify(contents, null, 2), 'utf8')
  console.log('wrote', path.relative(root, path.join(iosDir, 'Contents.json')))

  const gpDir = path.join(root, 'store-assets', 'google-play')
  await writePng(await sharp(master1024).resize(512, 512).png().toBuffer(), path.join(gpDir, 'icon-512.png'))
  await writePng(
    await rasterFeature(1024, 500).toBuffer(),
    path.join(gpDir, 'feature-graphic-1024x500.png'),
  )
  await writePng(
    await rasterFeature(180, 120).toBuffer(),
    path.join(gpDir, 'promo-graphic-180x120.png'),
  )

  const webDir = path.join(root, 'store-assets', 'web')
  let webFaviconMaster = master1024
  if (fs.existsSync(faviconSvgPath)) {
    webFaviconMaster = await sharp(faviconSvgPath, { density: 360 })
      .resize(512, 512, { fit: 'contain', position: 'centre', background: BG_TRANSPARENT })
      .png()
      .toBuffer()
    console.log('Favicons/apple-touch from', path.relative(root, faviconSvgPath), '(прозрачный фон)')
  }
  const resizeWeb = (px) =>
    sharp(webFaviconMaster).resize(px, px, { kernel: sharp.kernel.lanczos3 }).png().toBuffer()
  for (const px of [16, 32, 48, 192, 512]) {
    await writePng(await resizeWeb(px), path.join(webDir, `favicon-${px}.png`))
  }
  await writePng(await resizeWeb(180), path.join(webDir, 'apple-touch-icon-180.png'))

  const publicDir = path.join(root, 'public')
  await writePng(
    await fs.promises.readFile(path.join(webDir, 'favicon-32.png')),
    path.join(publicDir, 'favicon-32.png'),
  )
  await writePng(
    await fs.promises.readFile(path.join(webDir, 'favicon-16.png')),
    path.join(publicDir, 'favicon-16.png'),
  )
  await writePng(
    await fs.promises.readFile(path.join(webDir, 'apple-touch-icon-180.png')),
    path.join(publicDir, 'apple-touch-icon.png'),
  )

  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res')
  const splashAnimPath = path.join(resRoot, 'drawable-nodpi', 'splash_anim_icon.png')
  await writePng(await buildSplashAnimIconPng(), splashAnimPath)

  /* Нативная иконка приложения (рабочий стол) — @mipmap/ic_launcher, не веб-фавикон */
  const adaptiveFg = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  }
  const legacyLauncher = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  }
  if (fs.existsSync(resRoot) && (fs.existsSync(faviconSvgPath) || fs.existsSync(svgPath))) {
    for (const [folder, px] of Object.entries(adaptiveFg)) {
      await writePng(
        await rasterAndroidLauncherIcon(px, { opaque: false }),
        path.join(resRoot, folder, 'ic_launcher_foreground.png'),
      )
    }
    for (const [folder, px] of Object.entries(legacyLauncher)) {
      const buf = await rasterAndroidLauncherIcon(px, { opaque: true })
      await writePng(buf, path.join(resRoot, folder, 'ic_launcher.png'))
      await writePng(buf, path.join(resRoot, folder, 'ic_launcher_round.png'))
    }
    console.log('Android launcher icons from favicon/marketing SVG')
  }

  const splashTargets = []
  if (fs.existsSync(resRoot)) {
    const dirs = await fs.promises.readdir(resRoot)
    for (const d of dirs) {
      if (d !== 'drawable' && !d.startsWith('drawable-')) continue
      const splashFile = path.join(resRoot, d, 'splash.png')
      if (!fs.existsSync(splashFile)) continue
      const meta = await sharp(splashFile).metadata()
      if (!meta.width || !meta.height) continue
      splashTargets.push({ rel: path.join(d, 'splash.png'), w: meta.width, h: meta.height })
    }
  }

  const splashOut = path.join(root, 'store-assets', 'native-splash')
  for (const t of splashTargets) {
    const buf = await rasterFeature(t.w, t.h).toBuffer()
    const archived = path.join(splashOut, 'android-res', t.rel)
    await writePng(buf, archived)
    const live = path.join(resRoot, t.rel)
    if (fs.existsSync(path.dirname(live))) {
      await writePng(buf, live)
    }
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
