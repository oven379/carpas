# КарПас в светлой теме

## FAQ и блок скачивания на главной

- FAQ использует общую сетку главной. Пять вопросов раскрываются по одному, первый открыт при загрузке. Рамка появляется при наведении. Кнопка «Задать вопрос» ведёт по той же ссылке поддержки, что и футер.
- Секция «Тарифы» и её пункт в меню главной удалены.
- Карточки скачивания в финальном блоке используют присланные SVG Apple и Android.
- Скриншоты FAQ для компьютера и телефона находятся в `screenshots/home-faq`.

## Новый логотип КарПас

- `src/assets/brand-wordmark-light.svg` и `public/logo.svg` содержат присланный SVG. В `src/assets/brand-wordmark.svg` чёрные элементы заменены на светлые для тёмных фонов. Из двух полос знака собраны иконки сайта и значок уведомлений.
- Обновлены демонстрационные скриншоты гаража, карточки BMW, истории, визитов и CRM, а также превью сайта и статей. Скриншоты сняты в Chrome с локальными вымышленными данными.
- Описание третьего блока использует общий стиль описаний секций главной.

### Иллюстрации и запросы для встроенного ImageGen

- `src/assets/home-mountain-hero.webp` и `src/assets/home-mountain-hero-small.webp` содержат новый знак на переднем номере.
  > Use case: precise-object-edit. Image 1 is the editable original. Image 2 is the exact new CarPas logotype as artwork. The Cyrillic word is «Карпас» with uppercase К and lowercase letters, preceded by two diagonal bars, first copper and second black. Replicate the supplied vector shapes with very high fidelity. Keep Image 1's aspect ratio, framing, composition, every object and lighting exactly as they are. Change only the indicated tiny areas. Print the new logo centered on the existing dark rectangular front license plate, immediately under the BMW kidney grilles, x=350–573 y=694–750. Keep the plate itself dark, match its perspective. Adapt black artwork to warm white on this dark plate, keep copper bar. Wordmark should fill about 74% of plate width with balanced margins. Preserve the entire original car and backdrop pixel for pixel outside the plate. No other changes.
- `src/assets/home-process-bmw.webp` содержит новый знак на переднем номере.
  > Use case: precise-object-edit. Image 1 is the editable original. Image 2 is the exact new CarPas logotype as artwork. The Cyrillic word is «Карпас» with uppercase К and lowercase letters, preceded by two diagonal bars, first copper and second black. Replicate the supplied vector shapes with very high fidelity. Keep Image 1's aspect ratio, framing, composition, every object and lighting exactly as they are. Change only the indicated tiny areas. Print the supplied logo in the existing dark rectangular front plate at x=725–863 y=432–476 beneath the BMW grilles. On this dark plate only, change the logo's black parts to warm white and keep the copper bar. Fit and center the wordmark with breathing room and the original plate perspective. Preserve the entire courtyard, shadows, car, and exact wide 2:1 crop.
- `src/assets/home-app-showcase.webp` и `src/assets/home-app-showcase-mobile.webp` содержат новый знак в интерфейсе телефона и на номере автомобиля в макете.
  > Use case: precise-object-edit. Image 1 is the editable original. Image 2 is the exact new CarPas logotype as artwork. The Cyrillic word is «Карпас» with uppercase К and lowercase letters, preceded by two diagonal bars, first copper and second black. Replicate the supplied vector shapes with very high fidelity. Keep Image 1's aspect ratio, framing, composition, every object and lighting exactly as they are. Change only the indicated tiny areas. On the left phone only, replace the old Latin CarPass logo at the top (near x=893–995 and y=202–226) with the exact copper-and-black logo from Image 2, same apparent size and perspective. Also replace the existing tiny license plate lettering on the silver BMW within that phone with a miniature version of the same logo, leaving the car image and everything else intact. Preserve both devices, all other interface text, shadows, mountains, and original 1672×941 framing. No changes outside those two regions.
- `src/assets/home-road-banner.webp` содержит новый знак на заднем номере.
  > Use case: precise-object-edit. Image 1 is the editable original. Image 2 is the exact new CarPas logotype as artwork. The Cyrillic word is «Карпас» with uppercase К and lowercase letters, preceded by two diagonal bars, first copper and second black. Replicate the supplied vector shapes with very high fidelity. Keep Image 1's aspect ratio, framing, composition, every object and lighting exactly as they are. Change only the indicated tiny areas. Print the supplied logo on the existing dark rear license plate under the trunk badge of the BMW (x=1064–1149, y=575–599). On this dark plate, adapt the black shapes to warm white and keep the copper bar. Keep the original plate scale and perspective. Preserve the entire road, landscape, car, lighting, negative space, and crop exactly.

## Третий блок с мобильным приложением

- `src/about-landing/HomeFeatureShowcase.jsx` и `src/design/home-app-showcase.css` воспроизводят композицию референса с двумя телефонами и четырьмя выносками. Кнопки используют существующие ссылки на App Store и Android APK. На узких экранах выноски располагаются под иллюстрацией.
- `src/assets/home-app-showcase.webp` и `src/assets/home-app-showcase-mobile.webp` — иллюстрация и её мобильный кадр. Встроенный ImageGen отредактировал предоставленный референс по запросу ниже.

> Use case: precise-object-edit. Asset for the third section of the CarPass landing page. Image 1 is the edit target. Keep the two bronze-edged phones, their screen contents including the silver BMW 5 Series, their perspective, scale, placement, shadows, and the light mountain backdrop exactly as in the reference. Remove the left-hand heading, paragraph, label, and download buttons, and remove all four floating callout cards and their white connector lines and dots. Fill only the cleared areas with the surrounding pale warm ivory background and preserve the original wide 16:9 framing. Keep all original details on both phone screens. The finished image should contain only the phones, mountains, and backdrop.

## Второй блок «Как это работает» с BMW

- `src/about-landing/HomeProcess.jsx` и `src/design/home-process.css` воспроизводят композицию референса. Двухстрочный заголовок и описание слева, автомобиль и наклонённый телефон справа, три пронумерованные карточки внизу.
- В телефоне показана иллюстрация гаража с демонстрационными записями и BMW 5 Series. Интерфейс телефона, заголовки и карточки сделаны в HTML и CSS. На телефонах карточки складываются в одну колонку.
- `src/assets/home-process-bmw.webp` — фотография BMW, созданная встроенным ImageGen по предоставленному макету. `src/assets/home-process-bmw-thumb.webp` — миниатюра BMW из существующего изображения главной. Скриншоты второго блока находятся в `screenshots/home-process-bmw`.

### Запрос для фотографии BMW

> Generate ONLY a realistic new automotive photograph for the wide image area to the right of the second CarPass section in the reference. Landscape 2:1. Replace the reference's silver Volkswagen wagon with a metallic champagne-silver BMW 5 Series G30 facelift M Sport sedan, black kidney grille, dark multi-spoke wheels, front left three-quarter facing left, parked in the same pale warm beige concrete and limestone modern courtyard with crisp diagonal tree and architectural shadows. Preserve the reference photograph's composition: the full LEFT HALF is quiet pale stone wall and light stone pavement with shadows for a separate phone mockup to overlap; car occupies the RIGHT HALF, front grille near x=60–65%, windshield rises near y=20%, bumper and front tire touch y=84%; back of the sedan extends beyond the right edge. Authentic premium editorial photograph, muted warm ivory and champagne greys, realistic, soft directional afternoon light, crisp automobile detail. No phone, no text, no interface, no typography, no watermark, no border. Dark blank plate. The output is only the photograph, not the full reference layout.

## Полноэкранная главная по референсу

- `src/ui/pages/HomePage.jsx` и `src/design/home-sections.css` оформляют каждую основную секцию как экран с минимальной высотой `100svh`. При увеличении текста или раскрытии длинного ответа секция растёт по содержимому.
- «Как это работает» остаётся описанием с одной фотографией автомобиля. В отдельной секции «Возможности» компонент `src/about-landing/HomeFeatureShowcase.jsx` показывает реальные экраны КарПас в рамках ноутбука и телефона. Варианты переключаются кнопками и с клавиатуры.
- Обновлены преимущества и финальный блок. Регистрация, переход для бизнеса, ссылки скачивания и подвал собраны в одной заключительной секции. Inter и однотонные кнопки сохранены.
- `src/assets/home-feature-car-desktop.webp` — оптимизированный скриншот работающей карточки авто на тестовых данных. `src/assets/home-road-banner.webp` — иллюстрация финального блока, созданная встроенным ImageGen по приложенному референсу. Снимки обновлённой главной находятся в `screenshots/home-fullscreen`.

В Chrome проверены 360, 375, 390, 430, 768, 820, 1024, 1280, 1440 и 1920 px. Измерены высоты секций, проверены навигация, фото, FAQ, кнопки и переключение предпросмотра клавишей пробела. Веб-сборка и SEO-проверка прошли.

### Запрос для фотографии в финальном блоке

> Create a new photograph-only horizontal automotive campaign banner, wide 3:2 landscape, inspired ONLY by the very bottom road-trip banner in the supplied CarPass screenshot. A modern silver BMW-style executive sedan viewed from rear three-quarter, driving away on a smooth curving asphalt road through rocky mountains at late golden hour, the car on the right third around x=72%, y=67%; road curls gently right toward the warm horizon. The right half shows realistic textured mountain slopes, soft sun glint and a guardrail. Left half has hazy warm cream fog, weak detail, and naturally bleaches to pale ivory #F3EAE0 so a separate dark HTML headline can sit there. Warm copper and light cream palette, authentic editorial photography, clean and quiet mood. No text, UI, lettering, numbers, logos, watermarks, mockup frames or added graphic elements. Do not recreate the full screenshot, just the original landscape photograph for its closing banner.

## Все секции главной

- `src/ui/pages/HomePage.jsx` и `src/design/home-sections.css` задают новую сетку для аудиторий, возможностей, тарифов, FAQ, скачивания приложения и подвала.
- «Как это работает» состоит из описания и одной фотографии автомобиля из проекта. Импорты скриншотов приложения убраны с главной.
- `src/about-landing/HomeHero.jsx` показывает стрелку вниз у перехода к описанию. `src/design/home-reference.css` задаёт однотонные кнопки на первом экране и в шапке. Остальные кнопки главной используют ту же палитру.
- Снимки обновлённой главной находятся в `screenshots/home-sections`.

В Chrome проверены 360, 375, 390, 430, 768, 820, 1024, 1280, 1440 и 1920 px. Проверены якоря, FAQ, регистрация, вход через гараж, загрузка фотографии и однотонные кнопки. Веб-сборка и SEO-проверка прошли. Из 28 тестов прошли 27. Для оставшегося нужна PHP-модель из отсутствующего бэкенда.

## Главная по референсу и Inter

- `src/ui/pages/HomePage.jsx` и `src/about-landing/HomeHero.jsx` задают новую композицию первого экрана, полосу преимуществ, цены по действующим условиям и FAQ из проекта. CTA ведут в существующий гараж, регистрацию и разделы страницы.
- `src/about-landing/LandingNav.tsx` поддерживает навигацию по секциям главной. Остальные публичные страницы используют прежние пункты навигации.
- `src/design/home-reference.css` задаёт тёплую палитру главной, оформление секций, адаптивность и анимации. Из `src/design/home-and-car.css` убраны правила старого первого экрана.
- `src/design/theme.css`, `tailwind.config.js` и токены дизайн-системы используют Inter. В `src/assets/fonts` добавлены локальные Inter Variable WOFF2, включая кириллицу и курсив, и лицензия OFL.
- `src/assets/home-mountain-hero.webp` и `src/assets/home-mountain-hero-small.webp` содержат иллюстрацию, созданную встроенным ImageGen по приложенному референсу. Снимки новой главной находятся в `screenshots/home-inter`.

В браузере проверены 375, 390, 430, 768, 820, 1024, 1280, 1440 и 1920 px. Проверены загрузка Inter, якорь «Как это работает», открытие FAQ, режим регистрации и переход гостя из гаража ко входу. Сборка и SEO-проверка прошли. Результат тестов прежний, 27 из 28, так как для одного теста нужна PHP-модель из отсутствующего бэкенда.

### Запрос для новой иллюстрации

> Use the supplied landing-page design as an art direction reference only. Generate a brand-new LANDSCAPE 3:2 image of ONLY the automotive hero artwork that would occupy its right-hand area, without any UI or copy. Recreate the right-hand art direction very closely: realistic large metallic silver BMW 5 Series M Sport sedan (G30 facelift, black kidney grilles), low front-left three-quarter view, pointed to the left, with the whole silhouette visible and the tires well within frame. Body fills about 83% of the image width, from x=8% to 91%, and runs from y=34% to 88%; hood and headlights approximately center frame. Clean blank dark license plate, no text. Behind it a pale warm mountain landscape with defined rocky peaks and cream sky, within two very large slanted diagonal architectural cutout stripes exactly like the reference; warm latte/caramel translucent geometric bands lean right toward the top and fade into warm pale fog near the base. Left edge and bottom edge and bottom left should gradually blend into pure uniform light ivory #FAF6F1. Strong realistic contact shadow beneath the car fading softly, clean daylight, premium automotive campaign art, cohesive warm beige sky, cream foreground. Broad open negative space above the hood and to the left for later HTML elements. No header, no fonts, no letters, no interface, no callouts, no graphics or logos over the photograph, no watermarks. Landscape.

## Светлая тема всего проекта

Базовый снимок из файла передачи — `df92ff89a050de31aa7d69e48b5138e3d0e7610f`. После согласования главной и карточки авто общая палитра подключена на всех маршрутах.

- **Веб и WebView.** Единая палитра в `src/design/theme.css` задаёт кремовый фон, тёплые белые поверхности, графитовый текст и бронзовые акценты. Общие стили охватывают кнопки, поля, навигацию, карточки, статусы, меню, ошибки, загрузку и модальные окна. Затемнение поверх фотографий выделено отдельно. Inter Variable с кириллицей загружается локально.
- **Публичные страницы.** Общая светлая шапка используется на главной, страницах владельцев и бизнеса, в презентации и блоге. Обновлены скриншоты продукта. Служебный экран 404 и цвета браузера используют ту же палитру.
- **Кабинеты.** Светлая тема действует во входе, гараже, истории, документах, уведомлениях, CRM, заявках, техкартах и админке. Типы статусов различаются оттенками и подписями. Для узких экранов проверены переносы и размеры ключевых кнопок.
- **Expo.** Светлый экран запуска, фон WebView, индикатор загрузки и системная панель используют `expo/theme.json`. Светлый splash воспроизводится командой `node scripts/generate-store-assets.mjs --expo-splash-only`.
- **Дизайн-система.** Обновлены оба файла токенов для импорта в Figma и описание в `design-system/FIGMA.md`.
- **Материалы.** В `screenshots/light` — снимки сайта и кабинетов, в том числе с вымышленными данными. Архивный аудит и дальнейшие зоны работы описаны в `AUDIT.md`. Фото универсала в `src/assets/light-pilot-automotive.webp` создано встроенным ImageGen для главной.

Маршруты, правила доступа, контракты API, аналитика и SEO-метаданные сохранены. Исходные изображения и lock-файлы входят в архив.

## Запуск

`npm ci`, затем `npm run dev` в корне проекта. Публичные страницы работают локально без API. Для защищённых экранов нужен тестовый API из файла передачи. Инструкция для Expo — в `START-HERE.md`.

## Проверка

- Веб-сборка, предрендер, sitemap и SEO-проверка 32 страниц прошли.
- В Chrome проверены 34 маршрута и состояния на 360, 390, 768 и 1440 px. Закрытые страницы и форма визита проверялись через локальные ответы с вымышленными данными.
- Expo экспортировал бандлы для iOS и Android. Проверка WebView на устройстве и работа с тестовым API остаются частью интеграции.
- ESLint веб-проекта завершился без ошибок с 8 существующими предупреждениями. В тестах 27 из 28 прошли. Оставшийся тест требует `backend/app/Models/Detailing.php`, которого нет в дизайнерском пакете.

## Запрос для ImageGen

> Use case: photorealistic-natural. Create one premium editorial automotive photograph for a light-themed vehicle history website. Wide landscape composition 3:2. An unbranded compact European sport wagon, metallic champagne-silver / warm gray paint with black trim, viewed from front-left three-quarter, facing toward left, parked on pale stone at a sunlit minimalist modernist building. Directional afternoon sunlight creates an architectural diagonal shadow across a softly textured limestone wall. Sophisticated muted ivory and warm grey palette, almost monochromatic but natural. The car is fully visible, centered, with comfortable breathing space on all edges and all four boundaries of the car well within frame for responsive crops; place its wheels around 75% of the image height. Low camera height, real automotive photography, fine subtle film grain, tactile concrete, clean composition, crisp detail. No text, graphic elements, people, watermarks, readable plates, or logos. Not a mockup. No orange sunset or lens flares.
