#!/usr/bin/env bash
# Перенос встроенных data:…;base64 из БД в storage (Laravel disk public).
# Требуется запущенный docker compose из корня репозитория.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker compose exec -T backend php artisan media:migrate-embedded "$@"
