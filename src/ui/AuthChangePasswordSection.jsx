import { useState } from 'react'
import { Button, Field, Input } from './components.jsx'
import { formatHttpErrorMessage } from '../api/http.js'
import { OWNER_PASSWORD_MIN_LEN } from '../lib/format.js'

/** Смена пароля в настройках: PATCH с currentPassword + newPassword. */
export function AuthChangePasswordSection({ variant, r, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
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
    setBusy(true)
    try {
      let res
      if (variant === 'owner') {
        res = await r.updateOwnerMe({ currentPassword, newPassword })
      } else {
        res = await r.updateDetailingMe({ currentPassword, newPassword })
      }
      if (res?.passwordChanged) {
        setCurrentPassword('')
        setNewPassword('')
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
        <span className="field__label">Сменить пароль</span>
      </div>
      <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.45 }}>
        Сначала проверяется текущий пароль. После сохранения сессия завершится — войдите с почтой и новым паролем.
      </p>
      <div className="formGrid authFormGrid authFormGrid--owner">
        <Field className="field--full" label="Текущий пароль">
          <Input
            className="input mono"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field className="field--full" label="Новый пароль" hint={`Не короче ${OWNER_PASSWORD_MIN_LEN} символов`}>
          <Input
            className="input mono"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`от ${OWNER_PASSWORD_MIN_LEN} символов`}
          />
        </Field>
      </div>
      <Button type="button" className="btn" variant="primary" style={{ marginTop: 12 }} disabled={busy} onClick={() => save()}>
        {busy ? 'Сохранение…' : 'Сохранить пароль'}
      </Button>
    </div>
  )
}
