# КарПас (MVP‑прототип)

## Документация
- **Техническое задание (дополнение 0.4)**: см. файл `TZ.md` (раздел “Дополнения” помечен как ✅ ВЫПОЛНЕНО).

---

## Разработка (React + Vite)
Этот проект использует React + Vite для фронтенда.

Доступны два официальных плагина:
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) использует [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) использует [SWC](https://swc.rs/)

### React Compiler
React Compiler не включён в шаблоне из‑за влияния на производительность dev/build. Инструкция: https://react.dev/learn/react-compiler/installation

### ESLint/TypeScript
Для production‑приложений рекомендуется TypeScript с type-aware правилами. См. TS template: https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts

---

## Canonical runbook (how to run and see changes)

### 1. Backend API (required for lists, login, saves)

From the repo root:

```bash
docker compose up -d --build
```

Nginx + Laravel listen on **`http://127.0.0.1:8088`** (see `docker-compose.yml`). If this is down, the UI shows errors like “Failed to fetch” or the message from `src/api/http.js`.

### 2. Frontend — development (hot reload)

```bash
npm install
npm run dev
```

Open **`http://127.0.0.1:5173`** (or the URL Vite prints). The dev server proxies **`/api`** → `127.0.0.1:8088` (`vite.config.js`).

**To see your code changes:** save a file — the page updates automatically (HMR). If something looks stuck, hard-refresh the tab (**Ctrl+Shift+R** / **Cmd+Shift+R**).

### 3. Frontend — production preview (`vite preview`)

You must build first; preview serves the **`dist/`** folder:

```bash
npm run build
npm run preview
```

Default URL is **`http://127.0.0.1:4173`**. If the port is busy, Vite picks the next one (e.g. 4174) and prints it in the terminal — use that URL.

**To see changes after editing code:** run **`npm run build`** again, then refresh the browser (preview has no HMR).

### 4. LAN / phone on Wi‑Fi

If you open the app by **PC’s LAN IP** (e.g. `http://192.168.1.10:5173`), the client now uses relative **`/api`** on the same host so the Vite proxy still works. Without backend + Docker, requests will still fail.

### 5. Quality checks

```bash
npm run verify
```

(эквивалентно подряд: `npm run lint` и `npm run build`)

На Windows при **`npm ci`** иногда бывает `EPERM` на нативном модуле Vite/Rolldown (файл занят процессом) — закройте dev-сервер и IDE, либо выполните **`npm install`**.

### 6. Бэкенд: миграции и тесты (Docker)

С поднятыми **db** и **redis** (или полным `docker compose up`):

```bash
npm run docker:migrate
npm run test:backend
```

### 7. Deeper docs

- API and auth: **`FRONTEND_BACKEND_API.md`**
- Backend only: **`backend/README.md`**
- SEO (мета-теги, robots, sitemap, чеклист продакшена): **`SEO_INTERNAL.md`**

Установка зависимостей: в корне есть **`.npmrc`** (`legacy-peer-deps=true`) из‑за `react-helmet-async` и React 19.

### 8. Продакшен (краткий чеклист)

**Бэкенд (Laravel):** скопировать `backend/.env.example` → `backend/.env`, задать `APP_KEY` (`php artisan key:generate`), `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` с публичным URL API, рабочие `DB_*` и `REDIS_*`. Выполнить `php artisan migrate --force`, при необходимости `php artisan storage:link` (вложения поддержки и медиа в `/storage`). Переменные `ADMIN_SUPPORT_*` — уникальные секреты; фронт админки тикетов хранит Bearer в `sessionStorage` после логина.

**Фронт:** `npm ci && npm run build`, отдавать каталог **`dist/`** тем же хостом, что и SPA (или настроить прокси `/api` и `/storage` на бэкенд). В проде клиент ходит на **относительный** путь `/api` — отдельный `VITE_*` для URL API не требуется.

**Docker:** `docker compose up -d --build` подходит для разработки; на проде обычно отдельные сервисы БД/Redis и образ PHP-FPM + nginx (см. `backend/Dockerfile`, `backend/docker/nginx/default.conf`).

**Проверки перед выкладкой:** `npm run verify`, `docker compose run --rm backend php artisan test` (или `npm run test:backend`), `docker compose run --rm backend php artisan migrate --force`.
