import {
  fmtInt,
  PHOTO_UPLOAD_LANDSCAPE_LINE,
  PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE,
  VISIT_CARE_ADVICE_MAX_LEN,
  VISIT_OWNER_CARE_ADVICE_MAX_NONSPACE,
} from './format.js'
import { VISIT_MAX_PHOTOS } from './uploadLimits.js'

/**
 * Тексты подсказок (ServiceHint) для страницы истории и формы визита.
 * Общая форма для кабинета детейлинга и гаража владельца; часть текстов зависит от режима.
 */

/** Рекомендация для всех подсказок про прикрепление/показ фото в приложении. */
export const PHOTO_LANDSCAPE_HINT_SENTENCE = PHOTO_UPLOAD_LANDSCAPE_LINE

export const HISTORY_PAGE_HINT = {
  scopeId: 'history-page-hint',
  label: 'Справка: история',
  owner:
    'Здесь визиты и события: ТО, ремонты, детейлинг, заметки. Можно фильтровать записи от сервиса и свои записи.',
  detailing:
    'Здесь визиты по карточке клиента. Добавьте визит с заголовком, пробегом, комментарием и фото — запись появится у владельца в истории. ' +
    PHOTO_LANDSCAPE_HINT_SENTENCE +
    ' ' +
    PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE,
}

/** Черновик визита в кабинете детейлинга: не путать с сохранённой записью. */
export const HISTORY_DRAFT_DET_HINT = {
  scopeId: 'history-draft-det-hint',
  label: 'Справка: черновик визита',
  textDetailing:
    'Черновик виден только вам в кабинете и помечен в списке, пока вы не нажмёте «Сохранить». До сохранения владелец не видит эту запись в своей истории. Если выйти из формы кнопкой «Назад», несохранённый черновик можно сохранить или продолжить позже.',
}

export function historyPageHintText(mode) {
  return mode === 'detailing' ? HISTORY_PAGE_HINT.detailing : HISTORY_PAGE_HINT.owner
}

export const FORM_TITLE_HINT = {
  scopeId: 'history-visit-title-hint',
  label: 'Справка: заголовок визита',
}

export function formTitleHintText(maxLen) {
  return `До ${maxLen} символов; пробелы и знаки препинания считаются в лимит.`
}

export const FORM_MILEAGE_HINT = {
  scopeId: 'history-visit-mileage-hint',
  label: 'Справка: пробег визита',
}

export function formMileageHintText(baseMileageKm) {
  if (baseMileageKm) {
    return `Минимум ${fmtInt(baseMileageKm)} км — по данным карточки авто и прошлых визитов.`
  }
  return 'Укажите пробег на момент визита в километрах.'
}

export const FORM_SERVICES_TO_HINT = {
  scopeId: 'history-form-services-to',
  label: 'Справка: услуги ТО',
  textDetailing:
    'Список совпадает с услугами ТО в «Настройках лендинга» (справочник и свои названия). Поиск, несколько отметок, «Готово» закрывает окно.',
}

export const FORM_SERVICES_DET_HINT = {
  scopeId: 'history-form-services-det',
  label: 'Справка: детейлинг',
  textDetailing:
    'Список совпадает с услугами детейлинга в «Настройках лендинга» (справочник и свои названия). Поиск, несколько отметок, «Готово» закрывает окно.',
}

/** Блок услуг визита под комментарием: кузов / ДВС / ходовая / другое. */
export const FORM_SERVICES_VISIT_BLOCK_HINT = {
  scopeId: 'history-form-services-visit-block',
  label: 'Справка: услуги визита',
  textDetailing:
    'Здесь только те услуги, которые отмечены в «Настройках лендинга» (справочник и свои названия). Нужной позиции нет — сначала добавьте её в настройках и сохраните. Кузов, ДВС и ходовая совпадают с вашим списком; поиск подсказывает только его. Свою строку без совпадения добавить нельзя.',
  textOwner:
    'Полный справочник услуг (не привязан к профилю сервиса): кузов, ДВС, ходовая, покраска по деталям. Поиск подсказывает варианты; своя строка без совпадения в списке сохранится в «Другое».',
}

export const FORM_COMMENT_HINT = {
  scopeId: 'history-visit-comment-hint',
  label: 'Справка: комментарий к визиту',
  text: 'Свободный текст дополняет услуги ниже: что делали, материалы, детали. В карточке визита отображается как комментарий; вместе с выбранными услугами складывается история Вашего авто.',
}

export const FORM_PHOTOS_EDIT_HINT = {
  scopeId: 'history-visit-photos-hint',
  label: 'Справка: фото визита',
}

export function formPhotosEditHintText(count) {
  const tail = `${PHOTO_LANDSCAPE_HINT_SENTENCE} ${PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE}`
  if (count) {
    return `Загружено фотографий: ${count} из ${VISIT_MAX_PHOTOS}. Удалить можно через меню на снимке, если разрешено редактирование. ${tail}`
  }
  return `Пока нет фото. При разрешённом редактировании используйте кнопку загрузки ниже — снимки сохраняются сразу после выбора. ${tail}`
}

export const FORM_ADD_PHOTOS_HINT = {
  scopeId: 'history-add-photos-hint',
  label: 'Справка: загрузка фото',
  text: `Не более ${VISIT_MAX_PHOTOS} фото на один визит: можно выбрать несколько файлов за раз — снимки сразу прикрепятся к визиту (новый визит появится в списке после первой загрузки). ${PHOTO_LANDSCAPE_HINT_SENTENCE} ${PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE}`,
}

/** Единое поле совета детейлинга для владельца (форма визита). */
export const FORM_CARE_ADVICE_HINT = {
  scopeId: 'history-visit-care-advice-hint',
  label: 'Справка: совет от сервиса',
}

export function formCareAdviceHintText() {
  return `Необязательно, до ${VISIT_CARE_ADVICE_MAX_LEN} символов. На карточке авто владелец видит один текст в выпадающем блоке «Совет» (из последнего визита сервиса). Пустое поле — стандартная фраза КарПас.`
}

/** Одно поле совета владельца к своему визиту (форма истории в гараже). */
export const FORM_OWNER_VISIT_ADVICE_HINT = {
  scopeId: 'history-visit-owner-advice-hint',
  label: 'Справка: совет к визиту',
}

export function formOwnerVisitAdviceHintText() {
  return `Необязательно. Длина текста ограничена (примерно до ${VISIT_OWNER_CARE_ADVICE_MAX_NONSPACE} букв и цифр; пробелы между словами не уменьшают лимит). Сохраняется вместе с визитом; на карточке авто в блоке «Совет» показывается текст из последнего по дате визита.`
}

/** Карточка владельца «Последний визит» на странице авто */
export const CAR_SERVICE_ACCESS_HINT = {
  label: 'Справка: последний визит',
  noService:
    'Карточка только в вашем гараже: обслуживание у партнёра ещё не привязано. Записи «от сервиса» появятся после привязки через улицу или когда детейлинг заведёт авто на ваш аккаунт.',
  linked:
    'Указаны детейлинг, с которым связана машина (можно открыть публичную страницу), и дата последнего визита по записям «от сервиса» в «Истории». Город и телефон в блоке — из вашего профиля гаража, если поля заполнены.',
  pending:
    'Заявка на привязку к сервису на рассмотрении. После одобрения детейлингом в гараже появится полная история «от сервиса». Ниже — данные сервиса и дата последнего визита, если такие записи уже есть.',
  rejected:
    'Заявка на привязку отклонена. Уточните данные и попробуйте снова через улицу или свяжитесь с сервисом. Ниже — сведения о сервисе по карточке и дата последнего визита при наличии записей.',
}

/** Блок «Фото последнего визита» на карточке авто */
export const CAR_WASH_PHOTOS_HINT = {
  label: 'Справка: фото последнего визита',
  text:
    'Показываются снимки последнего по дате визита, к которому они прикреплены в «Истории». Удалить фото можно в разделе «Редактировать» карточки. ' +
    PHOTO_LANDSCAPE_HINT_SENTENCE +
    ' ' +
    PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE,
}

/** Блок «Совет» на карточке авто */
export const CAR_CARE_RECS_HINT = {
  label: 'Справка: совет по уходу',
  intro: `Один текст из последнего визита детейлинга. В форме визита — до ${VISIT_CARE_ADVICE_MAX_LEN} символов; пустое поле — стандартная фраза.`,
  emptyRecs: 'Нет визита от сервиса — показывается стандартный совет.',
}
