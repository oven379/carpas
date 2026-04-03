export function partnerLoginErrorMessage(reason) {
  if (reason === 'bad_password') return 'Неверный пароль'
  if (reason === 'not_found') return 'Нет учётной записи с такой почтой'
  if (reason === 'bad_credentials') return 'Укажите почту и пароль'
  return 'Не удалось войти'
}

export function partnerApplyErrorMessage(code) {
  if (code === 'bad_email') return 'Укажите почту'
  if (code === 'bad_name') return 'Укажите название'
  if (code === 'bad_contact_name') return 'Укажите имя'
  if (code === 'bad_phone') return 'Укажите телефон'
  if (code === 'bad_city') return 'Укажите город'
  if (code === 'bad_services') return 'Выберите хотя бы одну услугу (детейлинг или ТО)'
  if (code === 'bad_password') return 'Укажите пароль'
  if (code === 'email_taken') return 'Эта почта уже зарегистрирована'
  return 'Не удалось зарегистрировать'
}
