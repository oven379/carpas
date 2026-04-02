import { forwardRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo } from './useRepo.js'
import { clearSession, isAuthed } from './auth.js'
import { invalidateRepo } from './useRepo.js'
import { ComboBox } from './ComboBox.jsx'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

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

export const Card = forwardRef(function Card({ className = '', ...props }, ref) {
  return <div ref={ref} className={`card ${className}`.trim()} {...props} />
})

export function Pill({ children, tone = 'neutral', className = '' }) {
  return (
    <span className={`pill ${className}`.trim()} data-tone={tone}>
      {children}
    </span>
  )
}

/** Единый вид кнопки «Открыть». `asSpan` — внутри внешнего `<Link>`, без вложенных ссылок. */
export function OpenAction({ to, asSpan, className = '', children = 'Открыть →', ...rest }) {
  const cn = `link openAction ${className}`.trim()
  if (asSpan) {
    return (
      <span className={cn} {...rest}>
        {children}
      </span>
    )
  }
  return (
    <Link className={cn} to={to} {...rest}>
      {children}
    </Link>
  )
}

/** Назад: тонкий фиолетовый шеврон влево без подложки; возврат на предыдущую страницу в истории. */
export function BackNav({ className = '', title = 'Назад' }) {
  const nav = useNavigate()
  return (
    <button
      type="button"
      className={`backNav ${className}`.trim()}
      aria-label={title}
      title={title}
      onClick={() => nav(-1)}
    >
      <svg className="backNav__svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 18l-6-6 6-6"
        />
      </svg>
    </button>
  )
}

export function TopNav() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode } = useDetailing()
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
          <div className="nav__linksScroll">
            {mode === 'detailing' ? (
              <NavLink to="/requests" className={linkClass}>
                Заявки{pendingClaims ? ` (${pendingClaims})` : ''}
              </NavLink>
            ) : null}
            {mode === 'detailing' ? (
              <NavLink to="/detailing" className={linkClass}>
                Кабинет
              </NavLink>
            ) : null}
          </div>
          <div className="nav__linksPersist">
            {mode === 'owner' && isAuthed() ? <OwnerSupportDropdown /> : null}
            {mode === 'guest' ? (
              <a className="nav__action" href={SUPPORT_LINK_HREF} target="_blank" rel="noopener noreferrer">
                Поддержка
              </a>
            ) : null}
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
          </div>
        </nav>
      </div>
    </header>
  )
}

