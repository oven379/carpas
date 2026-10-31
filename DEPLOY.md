# Сборка и выкладка КарПас

Основной домен: https://carpasss.ru. Рабочая конфигурация: `nginx.production.conf`.

## Сборка

Нужны Node.js 22+ и Chrome/Chromium. `CHROME_PATH` позволяет выбрать браузер.

```sh
npm ci
npm run verify
```

`build` создаёт Vite-артефакт, пререндерит все 32 маршрута из `scripts/routes.mjs`,
генерирует sitemap и проверяет готовый HTML. Любая ошибка останавливает сборку.
Не выкладывайте результат одного `vite build`: он не содержит SEO-страниц.

`VITE_SITE_ORIGIN=https://carpasss.ru` задаётся до сборки. Production по умолчанию
использует этот домен и без переменной. Для другого домена измените также robots.txt
и nginx. API по умолчанию — https://back.carpasss.ru/api.

`dist/index.html` — пререндер главной. `dist/spa.html` — отдельная оболочка для
кабинетов и динамических страниц. При выкладке нужны оба файла и все вложенные
каталоги, включая blog, business, owners, assets, og, robots.txt и sitemap.xml.

## Сервер

1. Сохраните текущие dist и nginx-конфигурацию для отката.
2. Выложите проверенный dist целиком; предпочтительно переключением каталога релиза.
3. Примените `nginx.production.conf` с актуальными путями к dist и сертификатам.
4. Сертификат фронтенда должен включать **carpasss.ru и www.carpasss.ru**.
   Сертификат API должен включать **back.carpasss.ru**. Редирект www выполняется
   после TLS: без подходящего сертификата редирект не исправит ошибку браузера.
5. Выполните `sudo nginx -t`, затем `sudo systemctl reload nginx`.
6. Проверьте публичные ответы по списку ниже. При сбое верните предыдущий релиз.

Не заменяйте маршрутизацию универсальным `try_files ... /index.html`: неизвестные
адреса должны возвращать 404, кабинеты — spa.html, маркетинг — свой HTML.
Если SEO-страница отсутствует, сервер не должен подменять её главной.

## Проверка после выкладки

- `/`, `/owners`, `/business`, `/blog` и новая статья: HTTP 200, контент и один H1
  в исходном HTML, уникальные title и canonical, JSON-LD.
- `/business/`: 301 на `/business`; HTTP и www: 301 на основной HTTPS-домен.
- Случайный несуществующий адрес: HTTP 404, а не 200.
- `/auth`: оболочка без контента/canonical главной, `X-Robots-Tag: noindex, nofollow`.
- `/spa.html`: прямой внешний доступ запрещён (404).
- `/robots.txt`, `/sitemap.xml`, `/og.png`: доступны; sitemap содержит все 32 URL.
- HTML: Cache-Control no-cache; хешированные JS/CSS: immutable.
- Присутствуют HSTS, X-Content-Type-Options, CSP и остальные защитные заголовки.
- https://back.carpasss.ru/api/health: HTTP 200.

После выкладки отправьте sitemap и ключевые страницы на переобход в Яндекс.Вебмастере
и Google Search Console. Подтверждение через DNS не требует meta verification.

## Бэкенд и эксплуатация

`docker-compose.yml` предназначен для разработки: в нём debug, стандартные пароли
и открытые порты БД/Redis. Не используйте его как production-конфигурацию.
В production нужны APP_ENV=production, APP_DEBUG=false, уникальные секреты,
закрытые от интернета БД/Redis, резервные копии и проверка восстановления.
Эти параметры нужно проверять на реальном сервере, исходники их не подтверждают.

Android APK: backend/storage/app/carpas-release.apk, выдача /api/download/android.
