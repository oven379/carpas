import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo } from './useRepo.js'
import { clearSession } from './auth.js'
import { invalidateRepo } from './useRepo.js'
import { ComboBox } from './ComboBox.jsx'

export function Button({ variant = 'primary', ...props }) {
  return <button data-variant={variant} {...props} />
}

export function Input(props) {
  return <input {...props} />
}

export function Textarea(props) {
  return <textarea {...props} />
}

export { ComboBox }

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <div className="field__top">
        <span className="field__label">{label}</span>
        {hint ? <span className="field__hint">{hint}</span> : null}
      </div>
      {children}
    </label>
  )
}

export function Card({ className = '', ...props }) {
  return <div className={`card ${className}`.trim()} {...props} />
}

export function Pill({ children, tone = 'neutral' }) {
  return (
    <span className="pill" data-tone={tone}>
      {children}
    </span>
  )
}

export function TopNav() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, detailing, mode } = useDetailing()
  const linkClass = ({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`
  const pendingClaims =
    mode === 'detailing' && detailingId && r.listClaimsForDetailing
      ? r.listClaimsForDetailing(detailingId).filter((x) => x.status === 'pending').length
      : 0
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          <Logo size={26} />
          <span>КарПас</span>
        </NavLink>
        <nav className="nav__links">
          {mode !== 'guest' ? (
            <button
              type="button"
              className="nav__link"
              onClick={async () => {
                const text =
                  'Поддержка (MVP)\n\n' +
                  `Страница: ${location.href}\n` +
                  `Браузер: ${navigator.userAgent}\n\n` +
                  'Опишите проблему и отправьте это сообщение в поддержку.'
                try {
                  await navigator.clipboard.writeText(text)
                  alert('Текст для поддержки скопирован. Вставьте его в сообщение.')
                } catch {
                  prompt('Скопируйте текст для поддержки', text)
                }
              }}
              title="Скопировать текст для поддержки"
            >
              Поддержка
            </button>
          ) : null}
          {mode === 'detailing' ? (
            <NavLink to="/requests" className={linkClass}>
              Заявки{pendingClaims ? ` (${pendingClaims})` : ''}
            </NavLink>
          ) : null}
          {mode === 'guest' ? (
            <>
              <NavLink to="/auth" className={linkClass}>
                Регистрация
              </NavLink>
              <NavLink to="/auth" className={linkClass}>
                Вход
              </NavLink>
            </>
          ) : (
            <>
              {mode === 'owner' ? (
                <NavLink to="/cars" className={linkClass}>
                  Мой гараж
                </NavLink>
              ) : null}
            </>
          )}
          {mode !== 'guest' ? (
            <button
              className="btn"
              data-variant="ghost"
              onClick={() => {
                clearSession()
                invalidateRepo()
                nav('/')
              }}
            >
              Выйти
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

