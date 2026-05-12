import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outDir = path.join(root, 'store-assets', 'app-store-release')
const screenshots69 = path.join(outDir, 'screenshots-iphone-6.9')
const screenshots65 = path.join(outDir, 'screenshots-iphone-6.5')
const metadataDir = path.join(outDir, 'metadata')
const appIconSrc = path.join(root, 'store-assets', 'app-store', 'AppIcon.appiconset', 'AppIcon-1024.png')
const appIconOut = path.join(outDir, 'app-icon-1024.png')

const sizes = [
  { dir: screenshots69, width: 1320, height: 2868, suffix: 'iphone-6.9' },
  { dir: screenshots65, width: 1242, height: 2688, suffix: 'iphone-6.5' },
]

const shots = [
  {
    file: '01-garage',
    title: 'История авто всегда под рукой',
    subtitle: 'КарПас хранит данные машины, визиты, фото и документы в одном аккуратном гараже.',
    screenTitle: 'Мой гараж',
    body: ['BMW 3 Series', 'VIN WBA8A9C50H...', 'Пробег 82 400 км', 'Последний визит: детейлинг кузова'],
    accent: '#C8A96E',
  },
  {
    file: '02-history',
    title: 'Вся история обслуживания',
    subtitle: 'Фиксируйте визиты, работы, пробег и рекомендации после каждого обслуживания.',
    screenTitle: 'История',
    body: ['Полировка кузова', 'Замена масла', 'Диагностика подвески', 'Фото до и после'],
    accent: '#7CA982',
  },
  {
    file: '03-docs',
    title: 'Документы и фото в карточке',
    subtitle: 'Сохраняйте важные материалы рядом с автомобилем и быстро открывайте их с телефона.',
    screenTitle: 'Документы',
    body: ['СТС', 'Сервисные заказ-наряды', 'Фото работ', 'Публичная ссылка'],
    accent: '#D08C60',
  },
  {
    file: '04-service',
    title: 'Удобно для сервиса',
    subtitle: 'Партнёрский кабинет помогает вести клиентские авто и пополнять историю обслуживания.',
    screenTitle: 'Кабинет сервиса',
    body: ['Клиентские автомобили', 'Заявки на привязку', 'Визиты и рекомендации', 'Поддержка владельца'],
    accent: '#8EA4D2',
  },
  {
    file: '05-share',
    title: 'Делитесь прозрачной историей',
    subtitle: 'Отправляйте публичную страницу авто без доступа к личному кабинету.',
    screenTitle: 'Публичная карточка',
    body: ['Марка, модель, VIN', 'Пробег и город', 'История визитов', 'Фото и документы'],
    accent: '#C8A96E',
  },
]

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function svgText(text, x, y, size, fill = '#F7F4EA', weight = 700, width = 0) {
  const attrs = width ? ` textLength="${width}" lengthAdjust="spacingAndGlyphs"` : ''
  return `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${attrs}>${esc(text)}</text>`
}

function wrapLines(text, maxChars) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function screenshotSvg({ width, height }, shot) {
  const scale = width / 1320
  const phoneX = Math.round(width * 0.145)
  const phoneY = Math.round(height * 0.385)
  const phoneW = Math.round(width * 0.71)
  const phoneH = Math.round(height * 0.47)
  const rx = Math.round(68 * scale)
  const innerX = phoneX + Math.round(40 * scale)
  const innerY = phoneY + Math.round(76 * scale)
  const innerW = phoneW - Math.round(80 * scale)
  const cardY = innerY + Math.round(190 * scale)
  const lineGap = Math.round(102 * scale)
  const titleLines = wrapLines(shot.title, 22)
  const subtitleLines = wrapLines(shot.subtitle, 34)

  const titleSvg = titleLines
    .map((line, i) => svgText(line, Math.round(width * 0.08), Math.round(height * 0.11 + i * 82 * scale), Math.round(58 * scale), '#FFFFFF', 800))
    .join('')
  const subtitleSvg = subtitleLines
    .map((line, i) => svgText(line, Math.round(width * 0.08), Math.round(height * 0.22 + i * 48 * scale), Math.round(34 * scale), '#D9D2C3', 500))
    .join('')

  const listSvg = shot.body
    .map((line, i) => {
      const y = cardY + Math.round(78 * scale) + i * lineGap
      return `
        <rect x="${innerX + Math.round(28 * scale)}" y="${y - Math.round(34 * scale)}" width="${Math.round(18 * scale)}" height="${Math.round(18 * scale)}" rx="${Math.round(9 * scale)}" fill="${shot.accent}"/>
        ${svgText(line, innerX + Math.round(70 * scale), y, Math.round(30 * scale), '#25211D', 650)}
      `
    })
    .join('')

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#080807"/>
        <stop offset="0.52" stop-color="#17130E"/>
        <stop offset="1" stop-color="#2A2115"/>
      </linearGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="${Math.round(28 * scale)}" stdDeviation="${Math.round(28 * scale)}" flood-color="#000000" flood-opacity="0.42"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${Math.round(width * 0.92)}" cy="${Math.round(height * 0.16)}" r="${Math.round(width * 0.34)}" fill="${shot.accent}" opacity="0.11"/>
    <circle cx="${Math.round(width * 0.08)}" cy="${Math.round(height * 0.88)}" r="${Math.round(width * 0.3)}" fill="#FFFFFF" opacity="0.05"/>
    ${titleSvg}
    ${subtitleSvg}
    <g filter="url(#shadow)">
      <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="${rx}" fill="#070707"/>
      <rect x="${phoneX + Math.round(14 * scale)}" y="${phoneY + Math.round(14 * scale)}" width="${phoneW - Math.round(28 * scale)}" height="${phoneH - Math.round(28 * scale)}" rx="${rx - Math.round(14 * scale)}" fill="#F8F2E8"/>
      <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${Math.round(88 * scale)}" rx="${Math.round(28 * scale)}" fill="#11100E"/>
      ${svgText('КарПас', innerX + Math.round(32 * scale), innerY + Math.round(57 * scale), Math.round(34 * scale), '#F7F4EA', 800)}
      <rect x="${innerX}" y="${cardY - Math.round(110 * scale)}" width="${innerW}" height="${Math.round(94 * scale)}" rx="${Math.round(22 * scale)}" fill="${shot.accent}"/>
      ${svgText(shot.screenTitle, innerX + Math.round(32 * scale), cardY - Math.round(48 * scale), Math.round(34 * scale), '#11100E', 800)}
      <rect x="${innerX}" y="${cardY}" width="${innerW}" height="${Math.round(450 * scale)}" rx="${Math.round(34 * scale)}" fill="#FFFFFF"/>
      ${listSvg}
      <rect x="${innerX}" y="${cardY + Math.round(500 * scale)}" width="${innerW}" height="${Math.round(180 * scale)}" rx="${Math.round(34 * scale)}" fill="#1A1714"/>
      ${svgText('Сохранено в истории авто', innerX + Math.round(34 * scale), cardY + Math.round(575 * scale), Math.round(30 * scale), '#F7F4EA', 750)}
      ${svgText('Доступно владельцу и сервису', innerX + Math.round(34 * scale), cardY + Math.round(628 * scale), Math.round(25 * scale), '#CFC6B8', 500)}
    </g>
    ${svgText('КарПас', Math.round(width * 0.08), Math.round(height * 0.925), Math.round(34 * scale), '#C8A96E', 800)}
    ${svgText('История Вашего авто', Math.round(width * 0.08), Math.round(height * 0.952), Math.round(24 * scale), '#D9D2C3', 500)}
  </svg>`
}

async function writePng(file, svg) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file)
}

const metadata = {
  short: 'КарПас — цифровая история автомобиля: гараж, визиты, документы и фото в одном приложении.',
  full: `КарПас помогает владельцам автомобилей и сервисам вести прозрачную историю машины.

Добавляйте автомобиль в личный гараж, сохраняйте VIN, госномер, пробег, город, фото, документы и историю обслуживания. Визиты, работы и рекомендации остаются в карточке авто, а публичной ссылкой можно поделиться без доступа к личному кабинету.

Для детейлинг-студий и автосервисов КарПас даёт удобный кабинет: клиентские автомобили, история работ, документы, заявки на привязку и понятная коммуникация с владельцем.

Возможности:
• личный гараж владельца;
• карточка автомобиля с основными данными;
• история визитов, работ и рекомендаций;
• фото и документы по авто;
• публичная ссылка на историю;
• кабинет партнёра для сервисов;
• поддержка и уведомления.

КарПас создан для тех, кто хочет сохранить историю автомобиля аккуратно, прозрачно и без бумажной суеты.`,
  keywords: 'авто,гараж,VIN,сервис,детейлинг,история авто,документы,пробег,СТО,машина',
  subtitle: 'История Вашего авто',
  category: 'Productivity / Utilities',
  supportUrl: 'https://carpasss.ru',
  privacyUrl: 'https://carpasss.ru/policy',
  marketingUrl: 'https://carpasss.ru',
  copyright: '© 2026 КарПас',
  reviewNotes: `Тестовый доступ для ревью нужно добавить перед отправкой:

Владелец:
логин: <укажите email тестового владельца>
пароль: <укажите пароль>

Партнёр:
логин: <укажите email тестового партнёра>
пароль: <укажите пароль>

Приложение использует WebView и подключается к API:
https://carpasss.ru/api

Push-уведомления используют Expo Push Token.`,
}

const readme = `# App Store release package

Папка содержит визуальные материалы и тексты для первого релиза КарПас в App Store.

## Скриншоты

- screenshots-iphone-6.9 — 5 PNG, размер 1320 x 2868.
- screenshots-iphone-6.5 — 5 PNG, размер 1242 x 2688.

Apple допускает 1–10 скриншотов в PNG/JPG/JPEG. Набор 6.9" является основным; 6.5" добавлен как запасной совместимый набор.

## Иконка

- app-icon-1024.png — иконка 1024 x 1024.

## Метаданные

- metadata/short-description.txt
- metadata/full-description.txt
- metadata/keywords.txt
- metadata/app-store-fields.md
- metadata/release-checklist.md
`

const fieldsMd = `# Поля App Store Connect

Название приложения: КарПас

Подзаголовок:
${metadata.subtitle}

Краткое описание:
${metadata.short}

Описание:
${metadata.full}

Ключевые слова:
${metadata.keywords}

Категория:
${metadata.category}

Support URL:
${metadata.supportUrl}

Privacy Policy URL:
${metadata.privacyUrl}

Marketing URL:
${metadata.marketingUrl}

Copyright:
${metadata.copyright}

Возрастной рейтинг:
Обычно 4+, если в приложении нет пользовательского контента с модерационными рисками, торговли регулируемыми товарами и взрослого контента. Перед отправкой пройдите анкету Age Rating в App Store Connect.
`

const checklist = `# Чеклист первого релиза App Store

- Создать приложение в App Store Connect.
- Bundle ID: ru.carpassport.app.
- В Expo/EAS заполнить projectId в expo/app.json или EXPO_PUBLIC_EAS_PROJECT_ID.
- Настроить Apple Developer Team и iOS credentials в EAS.
- Собрать production build: cd expo && eas build --platform ios --profile production.
- Проверить EXPO_PUBLIC_WEB_URL=https://carpasss.ru/auth/owner.
- Проверить EXPO_PUBLIC_API_BASE_URL=https://carpasss.ru/api.
- На backend выполнить миграции.
- Проверить https://carpasss.ru/api/health.
- В App Store Connect загрузить app-icon-1024.png.
- Загрузить скриншоты из screenshots-iphone-6.9.
- При необходимости загрузить screenshots-iphone-6.5.
- Заполнить описание, ключевые слова и URL из metadata/app-store-fields.md.
- Добавить тестовый аккаунт владельца и партнёра в Review Notes.
- Заполнить Privacy Nutrition Labels по данным: email, телефон, данные авто, фото/документы, идентификаторы push.
- Пройти Age Rating.
- Указать контактные данные для ревью.
- Отправить build на TestFlight, затем в App Review.
`

await fs.rm(outDir, { recursive: true, force: true })
await fs.mkdir(screenshots69, { recursive: true })
await fs.mkdir(screenshots65, { recursive: true })
await fs.mkdir(metadataDir, { recursive: true })

await fs.copyFile(appIconSrc, appIconOut)

for (const size of sizes) {
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    const file = path.join(size.dir, `${shot.file}-${size.suffix}.png`)
    await writePng(file, screenshotSvg(size, shot))
  }
}

await fs.writeFile(path.join(outDir, 'README.md'), readme, 'utf8')
await fs.writeFile(path.join(metadataDir, 'short-description.txt'), metadata.short + '\n', 'utf8')
await fs.writeFile(path.join(metadataDir, 'full-description.txt'), metadata.full + '\n', 'utf8')
await fs.writeFile(path.join(metadataDir, 'keywords.txt'), metadata.keywords + '\n', 'utf8')
await fs.writeFile(path.join(metadataDir, 'app-store-fields.md'), fieldsMd, 'utf8')
await fs.writeFile(path.join(metadataDir, 'review-notes-template.txt'), metadata.reviewNotes + '\n', 'utf8')
await fs.writeFile(path.join(metadataDir, 'release-checklist.md'), checklist, 'utf8')

console.log(`App Store release package generated: ${outDir}`)
