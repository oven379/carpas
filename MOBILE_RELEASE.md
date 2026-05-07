# КарПас — публикация мобильного приложения

Приложение построено на **Capacitor**: веб-сборка Vite оборачивается в нативный контейнер
для Android и iOS. Один codebase — два магазина.

---

## Перед любой сборкой

### Требования к окружению

| Инструмент | Версия | Установка |
|---|---|---|
| Node.js | 20.19+ | `nvm use 20.19.5` |
| Android Studio | последняя | `brew install --cask android-studio` |
| Xcode | 15+ | App Store на Mac |
| CocoaPods | последняя | `sudo gem install cocoapods` |

### Настройка при первом клоне

1. Скопировать секреты:
   ```bash
   # Продакшен API (создаётся один раз, в git не попадает)
   cp .env.example .env.production.local
   # Вписать: VITE_API_BASE_URL=https://carpasss.ru/api
   ```
2. Восстановить Android keystore (см. раздел Android ниже).
3. Установить зависимости: `npm install`

---

## Android — Google Play

### Файлы подписи (хранить в безопасном месте, в git не попадают)

| Файл | Назначение |
|---|---|
| `android/carpas-release.keystore` | Ключ подписи приложения |
| `android/keystore.properties` | Пароли к keystore |

**Содержимое `android/keystore.properties`:**
```properties
storeFile=carpas-release.keystore
storePassword=<пароль>
keyAlias=carpas
keyPassword=<пароль>
```
> Пароль хранится в памяти Claude для этого проекта. При необходимости — спроси.

### Сборка AAB для Play Market

```bash
nvm use 20.19.5
npm run build:mobile                  # веб-сборка + cap sync
cd android
./gradlew bundleRelease
```

Готовый файл:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Публикация в Google Play Console

1. [play.google.com/console](https://play.google.com/console) → создать приложение
2. App ID: `ru.carpassport.app`
3. Загрузить `app-release.aab` → Внутреннее тестирование → Производство
4. Графика из `store-assets/google-play/`:
   - `icon-512.png` — иконка
   - `feature-graphic-1024x500.png` — баннер

### Обновление версии перед новым релизом

В `android/app/build.gradle`:
```groovy
versionCode 10002        // +1 к предыдущему
versionName "1.0.3"      // семантическая версия
```

---

## iOS — App Store

### Требования

- Mac с Xcode 15+ (установить из App Store)
- Активный аккаунт Apple Developer ($99/год)
- CocoaPods уже установлен (`brew install cocoapods` — уже сделано)

### Текущее состояние iOS проекта

iOS проект уже создан в `ios/`. Осталось только:

```bash
# 1. Установить Xcode из App Store, затем:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# 2. Установить CocoaPods зависимости
cd /Users/aleksandrkulikov/Projects/carpas/ios/App
pod install

# 3. Открыть в Xcode
cd /Users/aleksandrkulikov/Projects/carpas
npx cap open ios
```

### Настройка подписи в Xcode (один раз)

1. Открыть `ios/App/App.xcworkspace` в Xcode
2. Выбрать таргет `App` → вкладка **Signing & Capabilities**
3. Team: выбрать Apple Developer аккаунт
4. Bundle ID: `ru.carpassport.app` (уже задан)

### Первая публикация в App Store

1. **Product → Archive**
2. В открывшемся Organizer → **Distribute App**
3. Выбрать **App Store Connect → Upload**
4. Дождаться обработки → в App Store Connect создать релиз
5. Графика из `store-assets/app-store/`:
   - `AppIcon.appiconset/AppIcon-1024.png` — иконка (уже встроена в проект)
   - Скриншоты сделать вручную на симуляторе iPhone

### Обновление iOS приложения

```bash
nvm use 20.19.5
npm run build:mobile
npx cap sync ios
npx cap open ios
# далее: Product → Archive в Xcode
```

### Обновление версии перед новым релизом

В `ios/App/App.xcodeproj/project.pbxproj` найти и обновить (оба вхождения):
```
MARKETING_VERSION = 1.0.3;       // видимая версия
CURRENT_PROJECT_VERSION = 10002; // build number, должен расти
```
Или в Xcode: таргет `App` → вкладка **General** → поля Version и Build.

---

## Чеклист готовности к публикации

### Android (Google Play)
- [x] Capacitor проект настроен (`android/`)
- [x] App ID: `ru.carpassport.app`
- [x] Keystore создан (`android/carpas-release.keystore`)
- [x] `build.gradle` подключает keystore автоматически
- [x] Иконки в `android/res/mipmap-*/`
- [x] `store-assets/google-play/` — иконка 512px и баннер 1024x500
- [x] `gradle.properties` — Windows-путь убран, macOS-совместимый
- [ ] **Установить Android Studio** → собрать AAB → загрузить в Play Console

### iOS (App Store)
- [x] Capacitor проект создан (`ios/`)
- [x] Bundle ID: `ru.carpassport.app`
- [x] Иконки скопированы в `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- [x] Версия: 1.0.2, build: 10001
- [x] CocoaPods установлен
- [ ] **Установить Xcode** → `pod install` → настроить Signing → Archive

---

## Конфигурационные файлы

| Файл | Назначение |
|---|---|
| `capacitor.config.json` | App ID, имя, схема WebView |
| `.env.production.local` | `VITE_API_BASE_URL` для продакшен-сборки (не в git) |
| `android/keystore.properties` | Пароли Android keystore (не в git) |
| `android/carpas-release.keystore` | Android ключ подписи (не в git) |
| `store-assets/` | Иконки и графика для магазинов |

## Команды быстрого старта

```bash
# Обновить приложение в обоих магазинах
nvm use 20.19.5
npm run build:mobile

# Android: собрать AAB
cd android && ./gradlew bundleRelease

# iOS: открыть в Xcode
npx cap open ios
```
