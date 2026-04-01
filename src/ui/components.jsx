import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo } from './useRepo.js'
import { clearSession, isAuthed } from './auth.js'
import { invalidateRepo } from './useRepo.js'
import { ComboBox } from './ComboBox.jsx'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

function ownerGaragePath(r, ownerEmail) {
  if (!ownerEmail) return '/cars'
  const list = r.listCars({ ownerEmail })
  return list.length === 1 ? `/car/${list[0].id}` : '/cars'
}

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

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`.trim()}>
      <div className={`field__top${hint ? '' : ' field__top--solo'}`}>
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

export function Pill({ children, tone = 'neutral', className = '' }) {
  return (
    <span className={`pill ${className}`.trim()} data-tone={tone}>
      {children}
    </span>
  )
}

export function TopNav() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode, owner } = useDetailing()
  const linkClass = ({ isActive }) => `nav__action${isActive ? ' is-active' : ''}`
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
                <NavLink to={ownerGaragePath(r, owner?.email)} className={linkClass}>
                  Мой гараж
                </NavLink>
              ) : null}
            </>
          )}
          {mode === 'owner' && isAuthed() ? (
            <OwnerSupportDropdown />
          ) : (
            <a
              className="nav__action"
              href={SUPPORT_LINK_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              Поддержка
            </a>
          )}
          {mode !== 'guest' ? (
            <button
              type="button"
              className="nav__action"
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

