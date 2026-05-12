import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apiBase = 'http://127.0.0.1:8088/api'
const outDir = path.join(root, 'store-assets', 'app-store-real-screenshots-upload')
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const remoteDebuggingPort = 9400 + Math.floor(Math.random() * 500)
const chromeUserDataDir = path.join(root, `.codex-chrome-appstore-real-${remoteDebuggingPort}`)
const storagePrefix = 'cp.mvp.v1.'

const devices = [
  { key: 'iphone-6.9', label: 'iPhone 6.9', cssWidth: 440, cssHeight: 956, dpr: 3 },
  { key: 'iphone-6.5', label: 'iPhone 6.5', cssWidth: 414, cssHeight: 896, dpr: 3 },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function rmDirSafe(dir, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
      return
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(300)
    }
  }
}

async function waitForExit(child, ms = 5000) {
  if (child.exitCode !== null || child.signalCode !== null) return
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(ms),
  ])
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

async function chooseFrontendBase() {
  for (const url of ['http://127.0.0.1:5173', 'http://127.0.0.1:8088']) {
    try {
      const res = await fetch(url)
      if (res.ok) return url
    } catch {
      // try next
    }
  }
  throw new Error('Не найден запущенный frontend на 127.0.0.1:5173 или 127.0.0.1:8088.')
}

function ownerToSessionSnapshot(owner) {
  return {
    email: String(owner.email || ''),
    name: String(owner.name || ''),
    phone: String(owner.phone || ''),
    garageCity: String(owner.garageCity || ''),
    garageSlug: String(owner.garageSlug || ''),
    garagePrivate: Boolean(owner.garagePrivate),
    garageBannerEnabled: owner.garageBannerEnabled === true,
    garageBanner: typeof owner.garageBanner === 'string' ? owner.garageBanner : '',
    garageAvatar: typeof owner.garageAvatar === 'string' ? owner.garageAvatar : '',
    showPhonePublic: owner.showPhonePublic === true,
    garageWebsite: owner.garageWebsite != null ? String(owner.garageWebsite) : '',
    showWebsitePublic: owner.showWebsitePublic === true,
    garageSocial: owner.garageSocial != null ? String(owner.garageSocial) : '',
    garageVisitSelfAdvice:
      owner.garageVisitSelfAdvice != null ? String(owner.garageVisitSelfAdvice) : '',
    showSocialPublic: owner.showSocialPublic === true,
    showCityPublic: owner.showCityPublic === true,
    isPremium: Boolean(owner.isPremium),
    updatedAt: owner.updatedAt != null ? String(owner.updatedAt) : '',
    lastVisitAt: owner.lastVisitAt != null ? String(owner.lastVisitAt) : '',
  }
}

async function ensureDemoData() {
  const password = 'Pass12345'
  const email = 'appstore-real-owner@example.test'
  let auth
  try {
    auth = await jsonFetch(`${apiBase}/owners/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  } catch {
    auth = await jsonFetch(`${apiBase}/owners/register`, {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        name: 'Алексей',
        phone: '+79009990111',
      }),
    })
  }

  const token = auth.token
  const owner = auth.owner
  const authHeaders = { Authorization: `Bearer ${token}` }
  const cars = await jsonFetch(`${apiBase}/owners/cars`, { headers: authHeaders })
  let car = Array.isArray(cars)
    ? cars.find((item) => String(item.vin || '') === 'JHMCM56557C404453') || cars[0]
    : null

  if (!car) {
    car = await jsonFetch(`${apiBase}/owners/cars`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vin: 'JHMCM56557C404453',
        plate: 'А123ВС',
        plateRegion: '77',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
        mileageKm: 48200,
        color: 'перламутровый белый',
        city: 'Москва',
        segment: 'business',
        legalConsentAccepted: true,
      }),
    })
  }

  const events = await jsonFetch(`${apiBase}/owners/cars/${car.id}/events`, { headers: authHeaders })
  if (!Array.isArray(events) || events.length === 0) {
    await jsonFetch(`${apiBase}/owners/cars/${car.id}/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'visit',
        title: 'Плановое обслуживание',
        mileageKm: Math.max(Number(car.mileageKm || car.mileage_km || 48200), 48200),
        services: ['Детейлинг кузова', 'Химчистка салона'],
        maintenanceServices: ['Замена масла', 'Диагностика подвески'],
        note: 'Проверены расходники, рекомендации сохранены в истории.',
        careTips: {
          important: 'Проверить уровень масла через 1000 км.',
          tips: ['Повторить осмотр ЛКП после мойки.'],
        },
      }),
    })
  }

  return { owner: ownerToSessionSnapshot(owner), token, carId: String(car.id) }
}

async function waitForChromeJson(endpoint) {
  const url = `http://127.0.0.1:${remoteDebuggingPort}${endpoint}`
  for (let i = 0; i < 80; i++) {
    try {
      return await (await fetch(url)).json()
    } catch {
      await sleep(250)
    }
  }
  throw new Error('Chrome DevTools Protocol не запустился.')
}

async function openCdpTab() {
  const tab = await (
    await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/new?about:blank`, {
      method: 'PUT',
    })
  ).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  await new Promise((resolve) => {
    ws.onopen = resolve
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const callId = ++id
      pending.set(callId, (msg) => {
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`))
        else resolve(msg)
      })
      ws.send(JSON.stringify({ id: callId, method, params }))
    })
  return { ws, send }
}

async function waitUntilReady(send) {
  for (let i = 0; i < 60; i++) {
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body ? document.body.innerText : '';
        const busy = document.querySelector('[aria-busy="true"], .routeFallback');
        return { ready: document.readyState === 'complete' && text.trim().length > 30 && !busy, text: text.slice(0, 200) };
      })()`,
      returnByValue: true,
    })
    if (result.result?.result?.value?.ready) return
    await sleep(300)
  }
}

async function setOwnerSession(send, baseUrl, session) {
  await send('Page.navigate', { url: baseUrl })
  await waitUntilReady(send)
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('${storagePrefix}auth.owner', ${JSON.stringify(JSON.stringify(session.owner))});
      sessionStorage.setItem('${storagePrefix}auth.ownerToken', ${JSON.stringify(JSON.stringify(session.token))});
      sessionStorage.removeItem('${storagePrefix}auth.detailingId');
      sessionStorage.removeItem('${storagePrefix}auth.detailingToken');
    `,
  })
}

async function clearSession(send, baseUrl) {
  await send('Page.navigate', { url: baseUrl })
  await waitUntilReady(send)
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.removeItem('${storagePrefix}auth.owner');
      sessionStorage.removeItem('${storagePrefix}auth.ownerToken');
      sessionStorage.removeItem('${storagePrefix}auth.detailingId');
      sessionStorage.removeItem('${storagePrefix}auth.detailingToken');
    `,
  })
}

async function waitForPageText(send, text, timeoutMs = 60000) {
  if (!text) return
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await send('Runtime.evaluate', {
      expression: `document.body ? document.body.innerText : ''`,
      returnByValue: true,
    })
    const bodyText = String(result.result?.result?.value || '')
    if (bodyText.includes(text)) return
    await sleep(500)
  }
  throw new Error(`Страница не дождалась текста: ${text}`)
}

async function capturePage(send, url, filePath, waitText = '') {
  await send('Page.navigate', { url })
  await waitUntilReady(send)
  await waitForPageText(send, waitText)
  await sleep(800)
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo(0, 0);',
  })
  await sleep(250)
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  })
  fs.writeFileSync(filePath, Buffer.from(shot.result.data, 'base64'))
}

async function main() {
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome не найден: ${chromePath}`)
  }

  const frontendBase = await chooseFrontendBase()
  const session = await ensureDemoData()

  await rmDirSafe(outDir)
  fs.mkdirSync(outDir, { recursive: true })

  await rmDirSafe(chromeUserDataDir)
  fs.mkdirSync(chromeUserDataDir, { recursive: true })

  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${remoteDebuggingPort}`,
      `--user-data-dir=${chromeUserDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  let chromeExited = false
  chrome.once('exit', () => {
    chromeExited = true
  })

  try {
    await waitForChromeJson('/json/version')
    const { ws, send } = await openCdpTab()
    await send('Page.enable')
    await send('Runtime.enable')

    for (const device of devices) {
      const deviceDir = path.join(outDir, device.key)
      fs.mkdirSync(deviceDir, { recursive: true })
      await send('Emulation.setDeviceMetricsOverride', {
        width: device.cssWidth,
        height: device.cssHeight,
        deviceScaleFactor: device.dpr,
        mobile: true,
        screenWidth: device.cssWidth,
        screenHeight: device.cssHeight,
      })
      await send('Emulation.setUserAgentOverride', {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      })

      await clearSession(send, frontendBase)
      await capturePage(
        send,
        `${frontendBase}/auth/owner`,
        path.join(deviceDir, `01-login-${device.key}.png`),
        'В гараж',
      )

      await setOwnerSession(send, frontendBase, session)
      const screens = [
        ['02-garage', `${frontendBase}/garage`, 'Honda'],
        ['03-car-card', `${frontendBase}/car/${session.carId}`, 'Honda'],
        ['04-history', `${frontendBase}/car/${session.carId}/history`, 'Плановое обслуживание'],
        ['05-documents', `${frontendBase}/car/${session.carId}/docs`, 'Документы'],
        ['06-add-car', `${frontendBase}/create`, 'Согласие'],
      ]
      for (const [name, url, waitText] of screens) {
        await capturePage(send, url, path.join(deviceDir, `${name}-${device.key}.png`), waitText)
      }
    }

    ws.close()

    fs.writeFileSync(
      path.join(outDir, 'README.txt'),
      [
        'Реальные скриншоты приложения для App Store Connect.',
        '',
        `Источник интерфейса: ${frontendBase}`,
        'Снято из живых экранов приложения: вход, гараж, карточка авто, история, документы, добавление авто.',
        '',
        'Папки:',
        '- iphone-6.9: 1320x2868 px',
        '- iphone-6.5: 1242x2688 px',
        '',
        'Для первого релиза можно загрузить набор iphone-6.9; iphone-6.5 оставлен как дополнительный совместимый набор.',
      ].join('\r\n'),
      'utf8',
    )
  } finally {
    if (!chromeExited) {
      chrome.kill()
      await waitForExit(chrome)
    }
    try {
      await rmDirSafe(chromeUserDataDir)
    } catch {
      // Windows can keep Chrome's profile databases locked for a moment. The folder is temporary.
    }
  }

  console.log(outDir)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
