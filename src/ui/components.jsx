import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { clearSession, hasOwnerSession } from './auth.js'
import { ComboBox } from './ComboBox.jsx'
import { SupportButton } from './support/SupportHub.jsx'
import {
  formatPhoneRuInput,
  formatPhoneRuNationalDisplay,
  getPhoneRuNationalDigits,
} from '../lib/format.js'

export { default as ServiceHint } from './ServiceHint.jsx'
export { PageLoadSpinner } from './PageLoadSpinner.jsx'

export function Button({ variant = 'primary', onClick, disabled, type = 'button', ...props }) {
  const lockRef = useRef(false)
  const [pending, setPending] = useState(false)

  const handleClick = useCallback(
    (e) => {
      if (disabled || lockRef.current) return
      if (!onClick) return
      let result
      try {
        result = onClick(e)
      } catch {
        return
      }
      if (result != null && typeof result.then === 'function') {
        lockRef.current = true
        setPending(true)
        Promise.resolve(result).finally(() => {
          lockRef.current = false
          setPending(false)
        })
      }
    },
    [onClick, disabled],
  )

  return (
    <button
      type={type}
      data-variant={variant}
      {...props}
      disabled={disabled || pending}
      aria-busy={pending ? true : undefined}
      onClick={handleClick}
    />
  )
}

export const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} />
})

function PasswordVisibilityEyeIcon() {
  return (
    <svg className="passwordInputWrap__toggleIcon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function PasswordVisibilityEyeOffIcon() {
  return (
    <svg className="passwordInputWrap__toggleIcon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
      />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M1 1l22 22" />
    </svg>
  )
}

/** Поле пароля с кнопкой «глаз»: по умолчанию скрыто (`type=password`), по клику — показ (`text`). Реф — на input. */
export const PasswordInput = forwardRef(function PasswordInput(
  { className = 'input mono', disabled, onChange, onInput, onBlur, onAnimationStart, ...rest },
  ref,
) {
  /** false = пароль скрыт (дефолт для пользователя). */
  const [visible, setVisible] = useState(false)

  return (
    <div className="passwordInputWrap">
      <Input
        ref={ref}
        className={`passwordInputWrap__input${className ? ` ${className}` : ''}`.trim()}
        disabled={disabled}
        onChange={onChange}
        onInput={onInput}
        onBlur={onBlur}
        onAnimationStart={onAnimationStart}
        {...rest}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="passwordInputWrap__toggle"
        disabled={disabled}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <PasswordVisibilityEyeOffIcon /> : <PasswordVisibilityEyeIcon />}
      </button>
    </div>
  )
})

/** Телефон РФ: «+7» отдельно (обычная яркость), маска цифр — плейсхолдер тусклее. */
export const PhoneRuInput = forwardRef(function PhoneRuInput(
  { value, onChange, onBlur, className = '', id, disabled, autoComplete = 'tel', ...rest },
  ref,
) {
  const nationalDigits = getPhoneRuNationalDigits(value)
  const innerDisplayed = formatPhoneRuNationalDisplay(nationalDigits)

  return (
    <div className={`phoneRuField${className ? ` ${className}` : ''}`}>
      <span className="phoneRuField__cc">+7</span>
      <input
        ref={ref}
        id={id}
        type="tel"
        inputMode="tel"
        disabled={disabled}
        autoComplete={autoComplete}
        className="input phoneRuField__input"
        value={innerDisplayed}
        placeholder="999 999 00 00"
        {...rest}
        onBlur={onBlur}
        onChange={(e) => {
          const nextNational = getPhoneRuNationalDigits(e.target.value)
          if (!nextNational) {
            onChange?.({ target: { value: '' } })
            return
          }
          onChange?.({ target: { value: formatPhoneRuInput(`7${nextNational}`) } })
        }}
      />
    </div>
  )
})

export function Textarea(props) {
  return <textarea {...props} />
}

export { ComboBox }
export { CityComboBox } from './CityComboBox.jsx'
export { DropdownCaretIcon } from './DropdownCaretIcon.jsx'

/** Единый блок согласия с политикой и правилами на формах входа и регистрации. */
export function AuthLegalConsent({ inputId = 'auth-legal-consent', checked, onChange, className = '', style }) {
  return (
    <label className={`authConsent field--full ${className}`.trim()} htmlFor={inputId} style={style}>
      <input
        id={inputId}
        type="checkbox"
        className="authConsent__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="authConsent__text">
        Я соглашаюсь с{' '}
        <Link className="authConsent__legalLink" to="/">
          политикой конфиденциальности
        </Link>{' '}
        и{' '}
        <Link className="authConsent__legalLink" to="/">
          правилами использования сервиса
        </Link>
        .
      </span>
    </label>
  )
}

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

function HeroCoverStatIcon({ kind }) {
  if (kind === 'services') {
    return (
      <svg
        className="heroCoverStat__svg"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m14.5 4.5 4.5 4.5a2 2 0 010 2.8l-6.2 6.2a2 2 0 01-2.8 0l-4.5-4.5a2 2 0 010-2.8l6.2-6.2a2 2 0 012.8 0z" />
        <path d="M3 21l3.5-3.5M8 16l-1.5-1.5" />
      </svg>
    )
  }
  /* Заливочный силуэт авто (24dp), контрастнее прежнего однотонного контура */
  return (
    <svg className="heroCoverStat__svg heroCoverStat__svg--glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16C5.67 16 5 15.33 5 14.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
      />
    </svg>
  )
}

/**
 * Счётчик на обложке (гараж / детейлинг) или компактно в карточке.
 * `variant="overlay"` — стекло поверх фото; `variant="card"` — на светлом фоне.
 * `layout="inline"` — одна строка (например под заголовком списка).
 * `to` + не `linkDisabled` — ведёт на маршрут (например создание авто), при этом показывается число.
 */
export function HeroCoverStat({
  value,
  label,
  kind = 'car',
  variant = 'overlay',
  layout = 'stack',
  title,
  className = '',
  to,
  linkDisabled = false,
  'aria-label': ariaLabel,
}) {
  const v = value == null ? '—' : String(value)
  const labelStr = label != null && String(label).trim() ? String(label).trim() : ''
  const defaultAria = (title ?? (labelStr ? `${v} ${labelStr}` : `${v}`)).trim()
  const valueWide = v.length >= 3
  const mods = [
    'heroCoverStat',
    variant === 'card' ? 'heroCoverStat--card' : 'heroCoverStat--overlay',
    layout === 'inline' ? 'heroCoverStat--inline' : '',
    to ? 'heroCoverStat--link' : '',
    to && linkDisabled ? 'heroCoverStat--inactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
    <>
      <span className="heroCoverStat__icon" aria-hidden="true">
        <HeroCoverStatIcon kind={kind} />
      </span>
      <div className="heroCoverStat__body">
        <span className={`heroCoverStat__valueBox${valueWide ? ' heroCoverStat__valueBox--wide' : ''}`}>
          <span className="heroCoverStat__value">{v}</span>
        </span>
        {labelStr ? <span className="heroCoverStat__label">{labelStr}</span> : null}
      </div>
    </>
  )

  if (to && !linkDisabled) {
    const linkAria = ariaLabel ?? (title ? `Добавить автомобиль. ${title}` : 'Добавить автомобиль')
    return (
      <Link to={to} className={mods} aria-label={linkAria} title={title}>
        {body}
      </Link>
    )
  }
  if (to && linkDisabled) {
    const inactiveAria = ariaLabel ?? defaultAria
    return (
      <span className={mods} role="group" aria-label={inactiveAria} title={title}>
        {body}
      </span>
    )
  }
  const aria = ariaLabel ?? defaultAria
  return (
    <div className={mods} role="group" aria-label={aria}>
      {body}
    </div>
  )
}

/** Переход «вперёд»: шеврон вправо (зеркально «Назад»), цвет `var(--open-action)`. `asSpan` — внутри внешнего `<Link>`. */
export function OpenAction({ to, asSpan, className = '', title = 'Открыть', 'aria-label': ariaLabel, ...rest }) {
  const cn = `openAction ${className}`.trim()
  const label = ariaLabel ?? title
  const svg = (
    <svg className="openAction__svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18l6-6-6-6"
      />
    </svg>
  )
  if (asSpan) {
    return (
      <span className={cn} aria-hidden="true" title={title} {...rest}>
        {svg}
      </span>
    )
  }
  return (
    <Link className={cn} to={to} title={title} aria-label={label} {...rest}>
      {svg}
    </Link>
  )
}

/** Назад: шеврон влево. С `to` — `<Link>`; без `to` — шаг по истории. При `idx <= 0` сначала `location.state[stateFromKey]` (безопасный путь), иначе `fallbackTo`. */
export function BackNav({ className = '', title = 'Назад', to, fallbackTo, stateFromKey, linkState }) {
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
      <Link to={to} state={linkState} className={cn} aria-label={title} title={title}>
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
  const { detailingId, mode, detailing } = useDetailing()
  const detailingOnboarding =
    mode === 'detailing' && detailing && detailing.profileCompleted === false
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
        <NavLink end className="nav__brand" to="/" aria-label="КарПас — главная страница сервиса">
          <span className="navBrandLockup">
            <span className="navLogoFrame">
              <Logo size={26} tagline={false} markWrapperClassName="brandLogoMarkAlign" />
            </span>
          </span>
        </NavLink>
        <nav className="nav__links">
          <div className={`nav__linksScroll${isDetailingCabinet ? ' nav__linksScroll--partnerTools' : ''}`}>
            {isDetailingCabinet ? (
              <>
                {!detailingOnboarding ? (
                  <NavLink to="/requests" className={linkClass}>
                    Заявки ({pendingClaims})
                  </NavLink>
                ) : null}
                <SupportButton className="nav__action">Поддержка</SupportButton>
                <button type="button" className="nav__action" onClick={logout}>
                  Выйти
                </button>
              </>
            ) : null}
          </div>
          <div className="nav__linksPersist">
            {isPublicShowcasePage ? (
              <>
                <SupportButton className="nav__action nav__action--showcaseLogin">Поддержка</SupportButton>
                <Link className="nav__action nav__action--showcaseLogin" to="/auth">
                  Войти
                </Link>
              </>
            ) : (
              <>
                {hasOwnerSession() ? (
                  <>
                    <SupportButton className="nav__action">Поддержка</SupportButton>
                    <button type="button" className="nav__action" onClick={logout}>
                      Выйти
                    </button>
                  </>
                ) : null}
                {mode === 'guest' && !onAuthHub ? <SupportButton className="nav__action">Поддержка</SupportButton> : null}
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

