import { forwardRef, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo } from './useRepo.js'
import { clearSession, hasOwnerSession } from './auth.js'
import { invalidateRepo } from './useRepo.js'
import { ComboBox } from './ComboBox.jsx'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

export { default as ServiceHint } from './ServiceHint.jsx'

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

/** Назад: шеврон влево. С `to` — `<Link>`; без `to` — шаг по истории. При `idx <= 0` сначала `location.state[stateFromKey]` (безопасный путь), иначе `fallbackTo`. */
export function BackNav({ className = '', title = 'Назад', to, fallbackTo, stateFromKey }) {
  const navigate = useNavigate()
  const location = useLocation()
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
  const goBack = () => {
    if (typeof window !== 'undefined') {
      const idx = window.history.state?.idx
      if (typeof idx === 'number' && idx > 0) {
        navigate(-1)
        return
      }
    }
    if (stateFromKey) {
      const raw = location.state?.[stateFromKey]
      const f = typeof raw === 'string' ? raw.trim() : ''
      if (f.startsWith('/') && !f.startsWith('//') && !f.includes('..')) {
        navigate(f)
        return
      }
    }
    if (fallbackTo) {
      navigate(fallbackTo, { replace: true })
      return
    }
    navigate(-1)
  }
  return (
    <button type="button" className={cn} aria-label={title} title={title} onClick={goBack}>
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
  /** Публичные страницы /g/ и /d/ (на улице): в шапке «Войти» (прозрачная кнопка с обводкой) */
  const isPublicDetailingPage = /^\/d\/[^/]+\/?$/.test(loc.pathname)
  const isPublicGaragePage = /^\/g\/[^/]+\/?$/.test(loc.pathname)
  const isPublicShowcasePage = isPublicDetailingPage || isPublicGaragePage
  const isDetailingCabinet = mode === 'detailing' && !isPublicDetailingPage
  const [pendingClaims, setPendingClaims] = useState(0)
  useEffect(() => {
    if (!isDetailingCabinet || !detailingId) {
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
  }, [isDetailingCabinet, detailingId, r, r._version])
  const logout = () => {
    clearSession()
    invalidateRepo()
    nav('/auth', { replace: true })
  }
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand" aria-label="КарПас — на главную">
          <span className="nav__brandStack">
            <Logo />
            <span className="nav__brandTagline">История Вашего автомобиля</span>
          </span>
        </NavLink>
        <nav className="nav__links">
          <div className={`nav__linksScroll${isDetailingCabinet ? ' nav__linksScroll--partnerTools' : ''}`}>
            {isDetailingCabinet ? (
              <>
                <NavLink to="/requests" className={linkClass}>
                  Заявки ({pendingClaims})
                </NavLink>
                <button type="button" className="nav__action" onClick={logout}>
                  Выйти
                </button>
              </>
            ) : null}
          </div>
          <div className="nav__linksPersist">
            {isPublicShowcasePage ? (
              <Link className="nav__action nav__action--showcaseLogin" to="/auth">
                Войти
              </Link>
            ) : (
              <>
                {onAuthHub ? (
                  <Link className="nav__action" to="/about">
                    О сервисе
                  </Link>
                ) : null}
                {hasOwnerSession() ? (
                  <>
                    <OwnerSupportDropdown />
                    <button type="button" className="nav__action" onClick={logout}>
                      Выйти
                    </button>
                  </>
                ) : null}
                {mode === 'guest' && !onAuthHub ? (
                  <a className="nav__action" href={SUPPORT_LINK_HREF} target="_blank" rel="noopener noreferrer">
                    Поддержка
                  </a>
                ) : null}
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

