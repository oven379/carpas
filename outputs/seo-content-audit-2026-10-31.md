# SEO и тексты — 31 октября 2026

Проверены 20 статей и тексты главной, разделов для владельцев и бизнеса.
Проверка исходников и финального HTML, без данных о поисковых позициях и частотности.

## Что исправлено

- Убраны обещания невозможности подделки записей и гарантированной более высокой цены продажи.
- Для Geely, Belgee и Chery написаны разные инструкции со ссылками на официальные сайты.
  Электронная сервисная книжка как документ отделена от истории конкретного автомобиля.
- Четыре короткие статьи NND дополнены вопросами перед записью на услугу.
- Сокращены описания; URL сохранены. Сохранены тематические ссылки и короткие SEO-заголовки.
- Уточнено, что публичная ссылка доступна после 6 визитов владельца или через 3 месяца после создания первой записи.
  В ней записи владельца и связанные документы, а не визиты сервиса. Проверено по backend/app/Http/Support/ShareEligibility.php
  и backend/app/Http/Controllers/Api/CarShareController.php.
- В статьях показаны редакция и даты публикации/обновления. Sitemap учитывает дату обновления.
- CTA локальных услуг обращается к владельцу авто; новые статьи в списке блога показаны первыми.

## Следующие редакционные задачи

1. Добавить реальные фото до/после и кейсы в статьи об услугах. Цены, сроки и гарантии без данных студии не выдумывались.
   Контакты партнёров требуют периодической сверки.
2. Городские страницы CRM остаются шаблонными; нужны местные примеры, когда появятся фактические данные.
3. Общая сервисная книжка, история обслуживания и бортовой журнал частично пересекаются.
   Сохранены разные задачи: объяснение, организация истории, инструкция по добавлению визита.
   Объединять URL стоит по данным запросов и показов из поисковых кабинетов.
4. Участие в фестивале и сведения о партнёрах не подтверждались независимо; это редакционные сведения проекта.
5. Изменения локальные до выкладки. Серверные проблемы из предыдущего аудита требуют применения подготовленного конфига.

## Первоисточники

- Geely: https://www.geely-motors.com/for-owners/warranty/service-book/
- Belgee: https://belgee.ru/for-owners/warranty/ и https://belgee.ru/for-owners/support/usermanual/
- Chery: https://www.chery.ru/owners/service/chery-mobile/

## Проверка HTML

У всех 20 статей уникальные title и description, один H1, заполнены alt иллюстраций,
ссылки на другие статьи блога ведут на существующие URL. Это не прогноз позиций.

| Статья | Символов title | Символов description |
|---|---:|---:|
| `elektronnaya-servisnaya-knizhka` | 58 | 132 |
| `programma-dlya-avtoservisa` | 68 | 143 |
| `kak-vesti-istoriyu-obsluzhivaniya-avto` | 60 | 138 |
| `elektronnaya-servisnaya-knizhka-belgee` | 57 | 136 |
| `elektronnaya-servisnaya-knizhka-geely` | 55 | 135 |
| `elektronnaya-servisnaya-knizhka-chery` | 54 | 140 |
| `chto-takoe-carpas` | 69 | 135 |
| `carpas-tochka-sbora-2026` | 60 | 127 |
| `noname-detailing-voronezh` | 62 | 146 |
| `oklejka-plenkoy-avto-voronezh` | 46 | 152 |
| `keramika-avto-voronezh` | 52 | 144 |
| `polirovka-kuzova-voronezh` | 47 | 137 |
| `himchistka-salona-avto-voronezh` | 47 | 149 |
| `kak-prohodit-moyka-detailing-voronezh` | 52 | 140 |
| `prigon-avto-cifrovoy-pasport` | 50 | 135 |
| `kak-proverit-istoriyu-obsluzhivaniya-avto-pered-pokupkoj` | 63 | 131 |
| `keramika-polirol-vosk-zhidkoe-steklo-chto-vybrat` | 54 | 133 |
| `bortovoj-zhurnal-avtomobilya-v-telefone` | 60 | 139 |
| `istoriya-obsluzhivaniya-i-cena-avto-pri-prodazhe` | 53 | 147 |
| `carpas-crm-i-gotovyj-lending-dlya-detejlinga` | 51 | 137 |
