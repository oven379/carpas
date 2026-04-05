@echo off
setlocal enabledelayedexpansion

echo == Bootstrap Car Passport MVP ==
echo.

where docker >nul 2>nul || (echo Docker not found in PATH & exit /b 1)
where npm >nul 2>nul || (echo npm not found in PATH & exit /b 1)

if not exist backend (
  mkdir backend
)

if not exist backend\artisan (
  echo Creating Laravel 9 in .\backend (via Docker composer:2)...
  if exist backend_tmp rmdir /s /q backend_tmp

  docker run --rm -v "%cd%:/app" -w /app composer:2 create-project laravel/laravel backend_tmp "9.*" || exit /b 1

  echo Copying Laravel into .\backend ...
  robocopy backend_tmp backend /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD docker /XF Dockerfile .env.example >nul
  rmdir /s /q backend_tmp
)

if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
)

echo Starting docker compose...
docker compose up -d --build || exit /b 1

echo Installing backend deps / key / migrate...
docker compose exec -T backend composer install || exit /b 1
docker compose exec -T backend php artisan key:generate --force || exit /b 1
docker compose exec -T backend php artisan migrate --force --seed || exit /b 1

echo Installing frontend deps...
npm install || exit /b 1

echo.
echo Done.
echo UI:  http://localhost:5173   (run: npm run dev)
echo API: http://localhost:8088  (demo: studio@demo.car / 1111, owner@demo.car / 1111, test@test / 1111)
echo.
endlocal

