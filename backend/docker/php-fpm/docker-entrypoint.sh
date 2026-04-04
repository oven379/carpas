#!/bin/sh
set -e
cd /var/www/html || exit 1

mkdir -p \
  storage/logs \
  storage/framework/sessions \
  storage/framework/views \
  storage/framework/cache/data \
  bootstrap/cache

# Bind-mount с хоста (в т.ч. Windows): владелец файлов не совпадает с www-data в php-fpm —
# без прав на запись Laravel не может писать логи/кеш и отдаёт ошибку при сохранении.
chmod -R a+rwX storage bootstrap/cache 2>/dev/null || true

exec /usr/local/bin/docker-php-entrypoint "$@"
