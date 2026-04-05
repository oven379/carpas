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
npm run lint
npm run build
```

### 6. Deeper docs

- API and auth: **`FRONTEND_BACKEND_API.md`**
- Backend only: **`backend/README.md`**
