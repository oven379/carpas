import { useState } from 'react'
import { Button, Field, PasswordInput } from './components.jsx'
import { formatHttpErrorMessage } from '../api/http.js'
import { OWNER_PASSWORD_MIN_LEN } from '../lib/format.js'

function clearPasswordFields(setters) {
  for (const fn of setters) fn('')
}

/** Смена пароля в настройках: PATCH с currentPassword + newPassword. */
export function AuthChangePasswordSection({ variant, r, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordAgain, setNewPasswordAgain] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!String(currentPassword || '').trim()) {
      alert('Введите текущий пароль')
      return
    }
    if (String(newPassword || '').length < OWNER_PASSWORD_MIN_LEN) {
      alert(`Новый пароль: не менее ${OWNER_PASSWORD_MIN_LEN} символов.`)
      return
    }
    if (String(newPassword || '') !== String(newPasswordAgain || '')) {
      alert('Новый пароль и повтор не совпадают.')
      return
    }
    setBusy(true)
    try {
      let res
      if (variant === 'owner') {
        res = await r.updateOwnerMe({ currentPassword, newPassword })
      } else {
        res = await r.updateDetailingMe({ currentPassword, newPassword })
      }
      if (res?.passwordChanged) {
        clearPasswordFields([setCurrentPassword, setNewPassword, setNewPasswordAgain])
        onPasswordChanged?.()
        return
      }
      alert('Пароль не обновлён. Попробуйте ещё раз.')
    } catch (e) {
      alert(formatHttpErrorMessage(e, 'Не удалось сменить пароль.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="authChangePasswordSection topBorder" style={{ marginTop: 20, paddingTop: 20 }}>
      <div className="field__top" style={{ marginBottom: 10 }}>
        <span className="field__label">Пароль для входа</span>
      </div>
      <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.45, maxWidth: '62ch' }}>
        Введите текущий пароль и новый дважды. После успешной смены сессия завершится — войдите снова с тем же e-mail и новым
        паролем.
      </p>
      <div className="formGrid authFormGrid authFormGrid--owner">
        <Field className="field--full" label="Текущий пароль">
          <PasswordInput
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field className="field--full" label="Новый пароль" hint={`Не короче ${OWNER_PASSWORD_MIN_LEN} символов`}>
          <PasswordInput
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`от ${OWNER_PASSWORD_MIN_LEN} символов`}
          />
        </Field>
        <Field className="field--full" label="Повторите новый пароль">
          <PasswordInput
            autoComplete="new-password"
            value={newPasswordAgain}
            onChange={(e) => setNewPasswordAgain(e.target.value)}
            placeholder="ещё раз"
          />
        </Field>
      </div>
      <div className="row gap wrap" style={{ marginTop: 12 }}>
        <Button type="button" className="btn" variant="primary" disabled={busy} onClick={() => void save()}>
          {busy ? 'Меняем пароль…' : 'Сменить пароль'}
        </Button>
        <Button
          type="button"
          className="btn"
          variant="ghost"
          disabled={busy}
          onClick={() => clearPasswordFields([setCurrentPassword, setNewPassword, setNewPasswordAgain])}
        >
          Отмена
        </Button>
      </div>
    </div>
  )
}
