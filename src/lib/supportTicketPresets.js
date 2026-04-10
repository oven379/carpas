/** Текст по умолчанию для обращения при исчерпании лимита гаража (пользователь может править перед отправкой). */
export const GARAGE_LIMIT_SUPPORT_PREFIX =
  'Здравствуйте. Достигнут лимит гаража на добавление нового автомобиля. Прошу рассмотреть возможность расширения лимита или подсказать, как подключить ещё одно авто.\n\n'

/** Заявка на подключение Premium (расширение гаража). */
export const PREMIUM_GARAGE_REQUEST_PREFIX =
  'Здравствуйте. Прошу подключить Premium-аккаунт: хочу добавить в гараж больше двух автомобилей (сейчас действует бесплатный лимит).\n\n'

/** Поля контекста тикета для админ-панели: заявка на Premium. */
export const PREMIUM_GARAGE_TICKET_CONTEXT = {
  request_type: 'premium_garage',
  premium_account_request: true,
}

/** Текст после успешной отправки заявки на Premium из модалки поддержки. */
export const PREMIUM_GARAGE_SUCCESS_MESSAGE = 'Заявка принята. Мы свяжемся с вами в ближайшее время.'

/** Опции `openModal` для сценария «лимит гаража / Premium». */
export const PREMIUM_GARAGE_MODAL_OPTIONS = {
  premiumGarageFlow: true,
  bodyPrefix: PREMIUM_GARAGE_REQUEST_PREFIX,
  contextExtra: PREMIUM_GARAGE_TICKET_CONTEXT,
  successMessage: PREMIUM_GARAGE_SUCCESS_MESSAGE,
}
