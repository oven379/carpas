# Чеклист первого релиза App Store

- Создать приложение в App Store Connect.
- Bundle ID: ru.carpassport.app.
- В Expo/EAS заполнить projectId в expo/app.json или EXPO_PUBLIC_EAS_PROJECT_ID.
- Настроить Apple Developer Team и iOS credentials в EAS.
- Собрать production build: cd expo && eas build --platform ios --profile production.
- Проверить EXPO_PUBLIC_WEB_URL=https://carpasss.ru/auth/owner.
- Проверить EXPO_PUBLIC_API_BASE_URL=https://carpasss.ru/api.
- На backend выполнить миграции.
- Проверить https://carpasss.ru/api/health.
- В App Store Connect загрузить app-icon-1024.png.
- Загрузить скриншоты из screenshots-iphone-6.9.
- При необходимости загрузить screenshots-iphone-6.5.
- Заполнить описание, ключевые слова и URL из metadata/app-store-fields.md.
- Добавить тестовый аккаунт владельца и партнёра в Review Notes.
- Заполнить Privacy Nutrition Labels по данным: email, телефон, данные авто, фото/документы, идентификаторы push.
- Пройти Age Rating.
- Указать контактные данные для ревью.
- Отправить build на TestFlight, затем в App Review.
