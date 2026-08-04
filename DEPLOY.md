# Деплой и SEO-чеклист (КарПас, фронтенд)

Домен: **https://carpasss.ru** (канонический, без www).

## 1. Сборка и выкладка фронтенда

Фронтенд — SPA на Vite. При сборке запускается **пре-рендер** маркетинговых страниц
(`/`, `/about`, `/business`) в статический HTML — чтобы поисковики (особенно Яндекс)
видели контент, мета и JSON-LD без выполнения JavaScript. Пре-рендеру нужен Chrome/Chromium.

Переменные окружения задаются **до сборки** (Vite инлайнит их в бандл):

```bash
export VITE_SITE_ORIGIN=https://carpasss.ru      # для canonical / Open Graph / sitemap
# VITE_API_BASE_URL — не задавать в проде: клиент ходит на относительный /api
# VITE_GOOGLE_SITE_VERIFICATION=...   # опционально, из Google Search Console
# VITE_YANDEX_VERIFICATION=...        # опционально, из Яндекс.Вебмастера
```

Вариант А — собрать локально (Chrome есть) и выложить `dist/`:

```bash
npm ci
npm run build          # vite build + пре-рендер /, /about, /business
# → выложить каталог dist/ на сервер (rsync/scp)
```

Вариант Б — собрать на сервере (нужен Chromium):

```bash
sudo apt install -y chromium-browser
git pull
CHROME_PATH=/usr/bin/chromium-browser npm ci && CHROME_PATH=/usr/bin/chromium-browser npm run build
```

Если Chrome не найден — пре-рендер **мягко пропускается** (сборка не падает), но
маркетинговые страницы останутся SPA-«пустышкой» для краулеров. Для SEO Chrome нужен.

## 2. Nginx (отдача dist/)

Обязателен SPA-фолбэк, чтобы `/about` и `/business` отдавали свои пре-рендер-снимки:

```nginx
server {
    server_name carpasss.ru;
    root /path/to/dist;

    location / {
        try_files $uri $uri/ /index.html;   # /about → /about/index.html
    }

    location /api/     { proxy_pass http://127.0.0.1:8088; }   # Laravel
    location /storage/ { proxy_pass http://127.0.0.1:8088; }
}
```

- `http://carpasss.ru` и `https://www.carpasss.ru` → 301 на `https://carpasss.ru`.
- Проверить, что по домену отдаются `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/og.png`.

## 3. Мобильное приложение

- **iOS** — ссылка на App Store (уже в коде, `src/lib/appLinks.js`).
- **Android** — APK отдаёт бэкенд по `GET /api/download/android`.
  Файл положить в **`backend/storage/app/carpas-release.apk`**.

## 4. После деплоя — индексация и продвижение (вручную)

1. **Google Search Console** (https://search.google.com/search-console):
   добавить ресурс `carpasss.ru`, подтвердить, отправить `sitemap.xml`,
   «Проверка URL» → «Запросить индексирование» для `/`, `/business`.
2. **Яндекс.Вебмастер** (https://webmaster.yandex.ru):
   файл верификации `public/yandex_55a126c4b2885fc6.html` уже в проекте —
   подтвердить сайт, загрузить `sitemap.xml`, заказать переобход.
3. **Проверить превью ссылки:** вставить `carpasss.ru` в Telegram/VK —
   должна показаться карточка с OG-картинкой (`/og.png`, 1200×630).
4. **Ссылки на сайт** (для запроса «карпас», конкуренция с `carpass.ru`):
   соцсети, 2ГИС / Яндекс.Карты, публичные страницы сервисов `/d/<slug>`.

## Что уже настроено в коде

- Пре-рендер `/`, `/about`, `/business` (`scripts/prerender.mjs`, входит в `npm run build`).
- Уникальные `title` / `description` / `canonical` / Open Graph / JSON-LD по страницам.
- OG-картинка 1200×630 (`public/og.png`).
- `robots.txt`, `sitemap.xml` (только индексируемые URL), `llms.txt` — домен `carpasss.ru`.
- `noindex` на кабинете, входе, `/policy`, `/terms`, приватных `/share/…`.
