import { useState } from 'react'
import { Button, Field, Input } from './components.jsx'
import { formatHttpErrorMessage } from '../api/http.js'

/**
 * @param {object} props
 * @param {(email: string) => Promise<{ ok?: boolean, message?: string }>} props.sendForgot
 */
export function AuthForgotPasswordBlock({ sendForgot }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  return (
    <div className="authForgotBlock">
      <p className="muted small" style={{ margin: '10px 0 0' }}>
        <button
          type="button"
          className="link"
          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}
          onClick={() => {
            setOpen((v) => !v)
            setEmail('')
          }}
        >
          Забыли пароль?
        </button>
      </p>
      {open ? (
        <div className="authForgotBlock__panel topBorder" style={{ marginTop: 12, paddingTop: 12 }}>
          <p className="muted small" style={{ margin: '0 0 10px', lineHeight: 1.45 }}>
            Укажите почту аккаунта. Если она есть в системе, на неё придёт письмо с логином и новым паролем (старый перестанет
            действовать).
          </p>
          <Field className="field--full" label="Почта для восстановления">
            <Input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <div className="row gap wrap" style={{ marginTop: 10 }}>
            <Button
              type="button"
              className="btn"
              variant="primary"
              disabled={sending}
              onClick={async () => {
                const em = String(email || '').trim()
                if (!em) {
                  alert('Введите почту')
                  return
                }
                setSending(true)
                try {
                  const res = await sendForgot(em)
                  alert(
                    typeof res?.message === 'string' && res.message
                      ? res.message
                      : 'Если почта зарегистрирована, проверьте входящие (и папку «Спам»).',
                  )
                  setOpen(false)
                  setEmail('')
                } catch (e) {
                  alert(formatHttpErrorMessage(e, 'Не удалось отправить запрос. Попробуйте позже.'))
                } finally {
                  setSending(false)
                }
              }}
            >
              {sending ? 'Отправка…' : 'Отправить'}
            </Button>
            <button type="button" className="btn" data-variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
