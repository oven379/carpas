

/** Текст в попапе при исчерпании лимита (пользователю). */
export const PREMIUM_GARAGE_INTRO_TEXT =
  'Вы можете добавить и вести один автомобиль бесплатно. Чтобы добавить ещё, увеличьте лимит авто на своём аккаунте — нажмите «Увеличить лимит», и мы свяжемся с вами.'

/** Текст заявки в поддержку (тело обращения → видно в админке и в Telegram-боте). */
export const PREMIUM_GARAGE_REQUEST_PREFIX =
  'Запрос на увеличение лимита автомобилей в гараже. Владелец хочет добавить ещё одно авто (сейчас доступен один бесплатно). Прошу увеличить лимит на аккаунте.\n\n'

/** Поля контекста тикета для админ-панели: заявка на Premium. */
export const PREMIUM_GARAGE_TICKET_CONTEXT = {
  request_type: 'premium_garage',
  premium_account_request: true,
}

/** Текст после успешной отправки заявки из модалки поддержки. */
export const PREMIUM_GARAGE_SUCCESS_MESSAGE =
  'Отправили ваш запрос в поддержку — с вами свяжутся в ближайшее время.'

/** Опции `openModal` для сценария «лимит гаража / Premium». */
export const PREMIUM_GARAGE_MODAL_OPTIONS = {
  premiumGarageFlow: true,
  bodyPrefix: PREMIUM_GARAGE_REQUEST_PREFIX,
  contextExtra: PREMIUM_GARAGE_TICKET_CONTEXT,
  successMessage: PREMIUM_GARAGE_SUCCESS_MESSAGE,
}
