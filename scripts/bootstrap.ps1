param([switch]$Reset)

$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Команда '$name' не найдена. Установите/добавьте в PATH и повторите."
  }
}

Assert-Command docker
Assert-Command npm

Write-Host "== Bootstrap Car Passport MVP ==" -ForegroundColor Cyan

if ($Reset) {
  Write-Host "Останавливаю контейнеры и удаляю volume БД..." -ForegroundColor Yellow
  docker compose down -v
}

if (-not (Test-Path "backend")) { New-Item -ItemType Directory -Path "backend" | Out-Null }

if (-not (Test-Path "backend/artisan")) {
  Write-Host "Создаю Laravel 9 в ./backend (через Docker composer:2)..." -ForegroundColor Yellow
  if (Test-Path "backend_tmp") { Remove-Item -Recurse -Force "backend_tmp" }

  $root = (Get-Location).Path
  docker run --rm -v "${root}:/app" -w /app composer:2 create-project laravel/laravel backend_tmp "9.*"

  robocopy "backend_tmp" "backend" /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD "docker" /XF "Dockerfile" ".env.example" | Out-Null
  Remove-Item -Recurse -Force "backend_tmp"
}

if (-not (Test-Path "backend/.env")) { Copy-Item "backend/.env.example" "backend/.env" }

Write-Host "Поднимаю docker compose..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "Backend: composer install / key / migrate..." -ForegroundColor Cyan
docker compose exec -T backend composer install
docker compose exec -T backend php artisan key:generate --force
docker compose exec -T backend php artisan migrate --force --seed

Write-Host "Frontend: npm install..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Готово." -ForegroundColor Green
Write-Host "Далее запустите: npm run dev"
Write-Host "UI:  http://localhost:5173"
Write-Host "API: http://localhost:8088  (демо: studio@demo.car / 1111, owner@demo.car / 1111, test@test / 1111)"

