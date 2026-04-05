# Медиафайлы (картинки в storage)

После деплоя или на новой машине:

1. **`php artisan storage:link`** — симлинк `public/storage` → `storage/app/public`, иначе URL вида `/storage/media/...` не откроются.

2. **`APP_URL`** в `.env` должен совпадать с публичным адресом API (как заходит браузер), иначе в JSON придут неверные абсолютные ссылки на файлы.

3. Перенос старых data URI из БД в файлы (один раз при миграции данных):

   ```bash
   php artisan media:migrate-embedded
   ```

   Проверка без записи: `php artisan media:migrate-embedded --dry-run`.

В Docker из корня репозитория: `./scripts/migrate-embedded-media.sh` (или `docker compose exec backend php artisan media:migrate-embedded`).
