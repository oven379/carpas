# КарПас Expo app

Expo-приложение лежит отдельно от веб-фронта и backend. Оно открывает веб-приложение в `WebView`,
передаёт push-токен на Laravel API и использует те же аккаунты владельцев/партнёров.

## Первый запуск

```bash
cd expo
npm install
cp .env.example .env
```

В `.env` укажите:

```bash
EXPO_PUBLIC_WEB_URL=https://ваш-домен.ru/auth/owner
EXPO_PUBLIC_API_BASE_URL=https://ваш-домен.ru/api
EXPO_PUBLIC_EAS_PROJECT_ID=<id проекта EAS>
```

Локально на Android-эмуляторе можно оставить:

```bash
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:5173/auth/owner
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8088/api
```

## Push

Expo-приложение отправляет на backend `ExpoPushToken[...]`, поэтому backend должен иметь
`EXPO_PUSH_ENABLED=true`. Для сборок магазинов настройте EAS project id и push credentials в Expo/EAS.
Production-адреса сервиса заданы в `eas.json`; локальный `.env` нужен только для разработки.

Минимальная production-настройка:

1. `eas login`
2. `eas project:init` или привязка существующего проекта.
3. `eas project:info` → скопировать Project ID в `EXPO_PUBLIC_EAS_PROJECT_ID`.
4. `eas credentials` → настроить Android FCM и iOS APNs для проекта.
5. На backend оставить `EXPO_PUSH_ENABLED=true`.

Прямой Firebase FCM для backend не обязателен, пока приложение отправляет `ExpoPushToken[...]`.
Если появятся нативные FCM-токены, заполните `FIREBASE_PROJECT_ID` и `FIREBASE_CREDENTIALS_B64`
или `FIREBASE_CREDENTIALS_PATH` в `backend/.env`.

## Команды

```bash
npm run start
npm run android
npm run ios
eas build --platform android --profile production
eas build --platform ios --profile production
```
