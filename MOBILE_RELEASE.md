# КарПас — публикация мобильного приложения на Expo

Мобильное приложение теперь живёт в отдельной папке `expo/`. Backend и веб-фронт остаются в корне проекта:

- `backend/` — Laravel API.
- `src/` — веб-приложение Vite/React.
- `expo/` — Expo/React Native приложение для App Store и Google Play.

## Первый запуск Expo

```bash
cd expo
npm install
cp .env.example .env
npm run start
```

Для Android-эмулятора локально используйте `expo/.env`:

```bash
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:5173/auth/owner
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8088/api
```

Для релиза:

```bash
EXPO_PUBLIC_WEB_URL=https://carpasss.ru/auth/owner
EXPO_PUBLIC_API_BASE_URL=https://carpasss.ru/api
EXPO_PUBLIC_EAS_PROJECT_ID=<id проекта EAS>
```

Production-адреса также прописаны в `expo/eas.json`. Перед сборкой магазинов обязательно выполните `eas init`
и заполните `EXPO_PUBLIC_EAS_PROJECT_ID`, иначе push-токены Expo в production могут не выдаваться стабильно.

## Backend

Перед публикацией:

- продакшен API должен быть доступен по HTTPS;
- `/api/health` должен отвечать `{"ok":true}`;
- на backend должны быть выполнены миграции;
- для Expo push задайте `EXPO_PUSH_ENABLED=true`;
- для старых Firebase/FCM токенов можно дополнительно задать `FIREBASE_PROJECT_ID` и `FIREBASE_CREDENTIALS_PATH` или `FIREBASE_CREDENTIALS_B64`.

## Push

Expo-приложение получает `ExpoPushToken[...]` и отправляет его в Laravel API. Админская рассылка умеет отправлять такие токены через Expo Push API.

В админке `/admin/379team` → «Push-уведомления» проверьте:

- общий переключатель push включён;
- включена нужная аудитория: владельцы или партнёры;
- включена ручная рассылка.

## Android

Для открытия в Android Studio используйте именно native-проект Expo:

```text
C:\Users\PC\Desktop\projects\cursor\car-passport-mvp\expo\android
```

Проект обновлен на Expo SDK 55 / React Native 0.83.6 / targetSdk 36. Если менялись `expo/app.config.js`,
иконки, package id или permissions, синхронизируйте native-проект:

```bash
cd expo
npm install
npm exec -- expo prebuild --platform android
```

Локально на эмуляторе backend и web берутся из `expo/.env` через `10.0.2.2`, поэтому Docker/Vite должны быть запущены.

```bash
cd expo
npm run android
eas build --platform android --profile production
```

Для Google Play используется package id:

```text
ru.carpassport.app
```

Push credentials настраиваются через Expo/EAS.

Локальный release build не должен подписываться debug-ключом. Для локальной AAB-сборки задайте переменные:

```bash
CARPAS_ANDROID_KEYSTORE=<path-to-upload-keystore>
CARPAS_ANDROID_KEYSTORE_PASSWORD=<password>
CARPAS_ANDROID_KEY_ALIAS=<alias>
CARPAS_ANDROID_KEY_PASSWORD=<password>
```

Если используете EAS cloud build, управляйте Android signing credentials через EAS.

## iOS

```bash
cd expo
npm run ios
eas build --platform ios --profile production
```

Для App Store используется bundle id:

```text
ru.carpassport.app
```

Push credentials настраиваются через Expo/EAS.

Для App Store нужны Apple Developer account, bundle id `ru.carpassport.app`, APNs credentials через EAS,
privacy policy URL, App Privacy labels и TestFlight-проверка production-сборки.

## Проверки перед отправкой

```bash
npm run verify
docker compose exec -T backend php artisan migrate:status
docker compose exec -T backend php artisan test
cd expo
npm run lint
npm exec expo-doctor
eas build --platform android --profile production
eas build --platform ios --profile production
```

`expo-doctor` может предупреждать, что `app.config.js` не синхронизируется автоматически при наличии `expo/android`.
Это нормально для работы через Android Studio, но после изменения native-настроек всегда запускайте `expo prebuild`.

## Команды из корня

```bash
npm run expo:start
npm run expo:android
npm run expo:ios
```
