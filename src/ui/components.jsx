import { forwardRef, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo } from './useRepo.js'
import { clearSession, hasOwnerSession, isAuthed } from './auth.js'
import { invalidateRepo } from './useRepo.js'
import { ComboBox } from './ComboBox.jsx'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

export function Button({ variant = 'primary', ...props }) {
  return <button data-variant={variant} {...props} />
}

export const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} />
})

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

/** Назад: шеврон влево. С `to` — `<Link>` (надёжный переход в роутере); без `to` — кнопка «шаг назад» по истории. */
export function BackNav({ className = '', title = 'Назад', to }) {
  const navigate = useNavigate()
  const cn = `backNav ${className}`.trim()
  const svg = (
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
  )
  if (to) {
    return (
      <Link to={to} className={cn} aria-label={title} title={title}>
        {svg}
      </Link>
    )
  }
  return (
    <button type="button" className={cn} aria-label={title} title={title} onClick={() => navigate(-1)}>
      {svg}
    </button>
  )
}

export function TopNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const r = useRepo()
  const { detailingId, mode } = useDetailing()
  const linkClass = ({ isActive }) => `nav__action${isActive ? ' is-active' : ''}`
  const onAuthHub = loc.pathname === '/auth' || loc.pathname.startsWith('/auth/')
  /** Публичный лендинг детейлинга: только регистрация и поддержка (без входа/выхода в шапке) */
  const isPublicDetailingPage = /^\/d\/[^/]+\/?$/.test(loc.pathname)
  const isPublicGaragePage = /^\/g\/[^/]+\/?$/.test(loc.pathname)
  const isPublicShowcasePage = isPublicDetailingPage || isPublicGaragePage
  const [pendingClaims, setPendingClaims] = useState(0)
  useEffect(() => {
    if (mode !== 'detailing' || !detailingId) {
      setPendingClaims(0)
      return
    }
    let c = false
    ;(async () => {
      try {
        const list = await r.listClaimsForDetailing()
        if (!c && Array.isArray(list)) {
          setPendingClaims(list.filter((x) => x.status === 'pending').length)
        }
      } catch {
        if (!c) setPendingClaims(0)
      }
    })()
    return () => {
      c = true
    }
  }, [mode, detailingId, r, r._version])
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          <Logo size={26} />
        </NavLink>
        <nav className="nav__links">
          <div className="nav__linksScroll">
            {mode === 'detailing' && !isPublicDetailingPage ? (
              <NavLink to="/requests" className={linkClass}>
                Заявки{pendingClaims ? ` (${pendingClaims})` : ''}
              </NavLink>
            ) : null}
            {mode === 'detailing' && !isPublicDetailingPage ? (
              <NavLink to="/detailing" className={linkClass}>
                Кабинет
              </NavLink>
            ) : null}
          </div>
          <div className="nav__linksPersist">
            {isPublicShowcasePage ? (
              <>
                <Link className="nav__action" to="/auth/owner">
                  Зарегистрироваться
                </Link>
                <a className="nav__action" href={SUPPORT_LINK_HREF} target="_blank" rel="noopener noreferrer">
                  Поддержка
                </a>
              </>
            ) : (
              <>
                {onAuthHub ? (
                  <Link className="nav__action" to="/about">
                    О сервисе
                  </Link>
                ) : null}
                {hasOwnerSession() ? <OwnerSupportDropdown /> : null}
                {mode === 'guest' && !onAuthHub ? (
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
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

