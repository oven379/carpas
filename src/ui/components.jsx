import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useDetailing } from './useDetailing.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { clearSession, getSessionOwner, hasOwnerSession } from './auth.js'
import DefaultAvatar from './DefaultAvatar.jsx'
import { PageLoadSpinner } from './PageLoadSpinner.jsx'
import { resolvePublicMediaUrl } from '../lib/mediaUrl.js'
import { getApi } from '../api/index.js'
import { formatHttpErrorMessage } from '../api/http.js'
import { fmtDateTime } from '../lib/format.js'
import { isNativeApp } from '../lib/nativePlatform.js'
import { syncNotificationBadge } from '../lib/notificationBadge.js'
import { ComboBox } from './ComboBox.jsx'
import {
  formatPhoneRuInput,
  formatPhoneRuNationalDisplay,
  getPhoneRuNationalDigits,
} from '../lib/format.js'

export { default as ServiceHint } from './ServiceHint.jsx'
export { PageLoadSpinner }

export function Button({ variant = 'primary', onClick, disabled, type = 'button', className, ...props }) {
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

  const mergedClass = [className].filter(Boolean).join(' ') || undefined

  return (
    <button
      type={type}
      data-variant={variant}
      className={mergedClass}
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

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={['textarea', 'input', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})

export { ComboBox }
export { CityComboBox } from './CityComboBox.jsx'
export { DropdownCaretIcon } from './DropdownCaretIcon.jsx'

/** Согласие с политикой и правилами — только на шагах создания аккаунта (регистрация владельца, заявка партнёра). */
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
        Я принимаю условия{' '}
        <Link className="authConsent__legalLink" to="/terms">
          Пользовательского соглашения
        </Link>{' '}
        и{' '}
        <Link className="authConsent__legalLink" to="/policy">
          Политики конфиденциальности
        </Link>
        , даю согласие на обработку моих персональных данных (имя, телефон, email) для регистрации и работы в сервисе «Карпас»
      </span>
    </label>
  )
}

export function CarDataConsent({ inputId = 'car-data-consent', checked, onChange, className = '', style }) {
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
        Я даю отдельное согласие на обработку VIN-кода, государственного номера, фотографий автомобиля, пробега, марки, модели, цвета, года выпуска и города для формирования истории обслуживания и передачи выбранному мной детейлинговому центру
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
    !labelStr ? 'heroCoverStat--noLabel' : '',
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

function notificationKindLabel(kind) {
  if (kind === 'car_ready') return 'Авто'
  if (kind === 'service_reminder') return 'Напоминание'
  if (kind === 'owner_booking_request_sent') return 'Запись'
  if (kind === 'admin_broadcast') return 'Сервис'
  if (kind === 'admin_test') return 'Тест'
  return 'Уведомление'
}

function NotificationCenterOverlay({ open, owner, unreadCount, onClose, onLogout, onUnreadChange }) {
  const nav = useNavigate()
  const [payload, setPayload] = useState({ items: [], unread_count: unreadCount || 0 })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setErr('')
    try {
      const data = await getApi().notifications()
      const next = data && typeof data === 'object' ? data : { items: [], unread_count: 0 }
      const count = Number(next.unread_count || 0)
      setPayload(next)
      onUnreadChange(count)
      syncNotificationBadge(count)
    } catch (e) {
      setErr(formatHttpErrorMessage(e, 'Не удалось загрузить уведомления'))
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange, open])

  useEffect(() => {
    if (!open) return
    void load()
  }, [load, open])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  const items = Array.isArray(payload.items) ? payload.items : []
  const unread = Number(payload.unread_count || 0)
  const sessionOwner = owner || getSessionOwner() || {}
  const displayName = String(sessionOwner.name || '').trim() || 'Личный гараж'

  const updateUnread = (count, itemsPatch) => {
    const nextCount = Math.max(0, Number(count || 0))
    setPayload((p) => ({
      ...p,
      unread_count: nextCount,
      items: typeof itemsPatch === 'function' ? itemsPatch(Array.isArray(p.items) ? p.items : []) : p.items,
    }))
    onUnreadChange(nextCount)
    syncNotificationBadge(nextCount)
  }

  const markRead = async (n) => {
    const wasUnread = !n.readAt
    if (wasUnread) {
      updateUnread(unread - 1, (list) =>
        list.map((x) => (String(x.id) === String(n.id) ? { ...x, readAt: x.readAt || new Date().toISOString() } : x)),
      )
    }
    await getApi().notificationMarkRead(n.id).catch(() => {})
  }

  const openNotification = async (n) => {
    await markRead(n)
    const carId = String(n?.data?.carId || '').trim()
    const eventId = String(n?.data?.eventId || '').trim()
    const detailingId = String(n?.data?.detailingId || '').trim()
    onClose()
    if (n?.kind === 'owner_booking_request_sent' && carId) {
      const suffix = eventId ? `?visit=${encodeURIComponent(eventId)}` : ''
      nav(`/car/${encodeURIComponent(carId)}/history${suffix}`)
      return
    }
    if (detailingId && !isNativeApp()) {
      nav(`/d/${encodeURIComponent(detailingId)}`)
      return
    }
    if (detailingId && isNativeApp()) {
      nav('/garage')
    }
  }

  const clearAll = async () => {
    await getApi().notificationsClear()
    setPayload({ items: [], unread_count: 0 })
    onUnreadChange(0)
    syncNotificationBadge(0)
  }

  const goSettings = () => {
    onClose()
    nav('/garage/settings')
  }

  const logout = () => {
    onClose()
    onLogout()
  }

  const content = (
    <div className="profileCenter" role="dialog" aria-modal="true" aria-label="Центр уведомлений и профиля">
      <div className="profileCenter__sheet">
        <div className="profileCenter__head">
          <div className="profileCenter__profile">
            <span className="profileCenter__avatar" aria-hidden="true">
              {sessionOwner.garageAvatar ? (
                <img alt="" src={resolvePublicMediaUrl(sessionOwner.garageAvatar)} />
              ) : (
                <DefaultAvatar
                  email={String(sessionOwner.email || '').trim()}
                  fallback={displayName}
                  alt=""
                  className="profileCenter__avatarDefault"
                />
              )}
            </span>
            <div>
              <h2 className="profileCenter__title">Центр уведомлений</h2>
              <p className="profileCenter__subtitle">{unread > 0 ? `Новых: ${unread}` : displayName}</p>
            </div>
          </div>
          <button type="button" className="profileCenter__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="profileCenter__actions">
          <button type="button" className="btn" data-variant="outline" onClick={goSettings}>
            Настройки гаража
          </button>
          <button type="button" className="btn" data-variant="ghost" disabled={items.length === 0 || loading} onClick={clearAll}>
            Очистить уведомления
          </button>
        </div>

        <div className="profileCenter__list" aria-live="polite">
          {loading ? <PageLoadSpinner label="Загрузка уведомлений..." /> : null}
          {err ? <Card className="pad profileCenter__state"><p className="adminSupportErr">{err}</p></Card> : null}
          {!loading && !err && items.length === 0 ? (
            <Card className="pad profileCenter__state">
              <h3 className="h2">Пока пусто</h3>
              <p className="muted">Здесь появятся сообщения от сервиса и детейлинга.</p>
            </Card>
          ) : null}
          {items.map((n) => {
            const unreadItem = !n.readAt
            const canOpen = String(n?.data?.detailingId || '').trim() !== ''
            return (
              <button
                key={n.id}
                type="button"
                className={`profileCenter__item${unreadItem ? ' profileCenter__item--unread' : ''}`}
                onClick={() => void openNotification(n)}
              >
                <span className="profileCenter__itemTop">
                  <span className="notificationsItem__kind">{notificationKindLabel(n.kind)}</span>
                  <span className="muted small">{fmtDateTime(n.createdAt)}</span>
                </span>
                <span className="profileCenter__itemTitle">{n.title || 'Уведомление'}</span>
                <span className="profileCenter__itemBody">{n.body}</span>
                {canOpen ? <span className="profileCenter__itemHint">Открыть</span> : null}
              </button>
            )
          })}
        </div>

        <div className="profileCenter__footer">
          <button type="button" className="btn profileCenter__cancel" data-variant="outline" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn profileCenter__logout" data-variant="ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

function BellIcon({ className = 'nav__notifySvg' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 21h4"
      />
    </svg>
  )
}

function PartnerActivityOverlay({ open, pendingClaims, unreadNotifications, onClose }) {
  const nav = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  const go = (to) => {
    onClose()
    nav(to)
  }

  const content = (
    <div className="profileCenter partnerActivity" role="dialog" aria-modal="true" aria-label="Центр активности">
      <div className="profileCenter__sheet partnerActivity__sheet">
        <div className="profileCenter__head">
          <div className="profileCenter__profile">
            <span className="partnerActivity__bell" aria-hidden="true">
              <BellIcon />
            </span>
            <div>
              <h2 className="profileCenter__title">Центр активности</h2>
              <p className="profileCenter__subtitle">
                {pendingClaims || unreadNotifications
                  ? `Заявки: ${pendingClaims || 0} · уведомления: ${unreadNotifications || 0}`
                  : 'Новых событий нет'}
              </p>
            </div>
          </div>
          <button type="button" className="profileCenter__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="profileCenter__list partnerActivity__list" aria-live="polite">
          <button type="button" className="profileCenter__item partnerActivity__item" onClick={() => go('/requests')}>
            <span className="profileCenter__itemTop">
              <span className="notificationsItem__kind">Заявки</span>
              {pendingClaims ? <span className="nav__notifyBadge partnerActivity__rowBadge">{pendingClaims}</span> : null}
            </span>
            <span className="profileCenter__itemTitle">Заявки на привязку авто</span>
            <span className="profileCenter__itemBody">
              Новые запросы владельцев на привязку автомобиля к вашему кабинету.
            </span>
            <span className="profileCenter__itemHint">Открыть заявки</span>
          </button>

          <button type="button" className="profileCenter__item partnerActivity__item" onClick={() => go('/notifications')}>
            <span className="profileCenter__itemTop">
              <span className="notificationsItem__kind">Уведомления</span>
              {unreadNotifications ? (
                <span className="nav__notifyBadge partnerActivity__rowBadge">{unreadNotifications}</span>
              ) : null}
            </span>
            <span className="profileCenter__itemTitle">Уведомления сервиса</span>
            <span className="profileCenter__itemBody">
              Сообщения от админки, статусы отправки пушей и сервисные события.
            </span>
            <span className="profileCenter__itemHint">Открыть уведомления</span>
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

export function TopNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const r = useRepo()
  const { detailingId, mode, detailing, owner } = useDetailing()
  const detailingOnboarding =
    mode === 'detailing' && detailing && detailing.profileCompleted === false
  const linkClass = ({ isActive }) => `nav__action${isActive ? ' is-active' : ''}`
  /** Публичные страницы /g/ и /d/ (на улице): в шапке «Войти» (прозрачная кнопка с обводкой) */
  const isPublicDetailingPage = /^\/d\/[^/]+\/?$/.test(loc.pathname)
  const isPublicGaragePage = /^\/g\/[^/]+\/?$/.test(loc.pathname)
  const isPublicShowcasePage = isPublicDetailingPage || isPublicGaragePage
  const isDetailingCabinet = mode === 'detailing' && !isPublicDetailingPage
  const [pendingClaims, setPendingClaims] = useState(0)
  const [notificationsUnread, setNotificationsUnread] = useState(0)
  const [profileCenterOpen, setProfileCenterOpen] = useState(false)
  const [partnerActivityOpen, setPartnerActivityOpen] = useState(false)
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
  useEffect(() => {
    const canLoad = hasOwnerSession() || mode === 'detailing'
    if (!canLoad || isPublicShowcasePage) {
      setNotificationsUnread(0)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await getApi().notificationsUnreadCount()
        if (!cancelled) {
          const count = Number(res?.unread_count || 0)
          setNotificationsUnread(count)
          syncNotificationBadge(count)
        }
      } catch {
        if (!cancelled) setNotificationsUnread(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loc.pathname, mode, isPublicShowcasePage])
  const logout = () => {
    clearSession()
    invalidateRepo()
    nav('/auth', { replace: true })
  }
  const partnerActivityCount = Math.max(0, Number(pendingClaims || 0) + Number(notificationsUnread || 0))
  const partnerActivityActive = loc.pathname.startsWith('/requests') || loc.pathname.startsWith('/notifications')
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink end className="nav__brand" to="/" aria-label="КарПас — главная страница сервиса">
          <span className="navBrandLockup">
            <span className="navLogoFrame">
              <Logo size={36} tagline={false} markWrapperClassName="brandLogoMarkAlign" />
            </span>
          </span>
        </NavLink>
        <nav className="nav__links">
          <div className={`nav__linksScroll${isDetailingCabinet ? ' nav__linksScroll--partnerTools' : ''}`}>
            {isDetailingCabinet ? (
              <>
                {!detailingOnboarding ? (
                  <>
                    <NavLink to="/detailing/clients" className={linkClass}>
                      Клиенты
                    </NavLink>
                    <NavLink to="/detailing/landing" className={linkClass}>
                      Лендинг
                    </NavLink>
                    <button
                      type="button"
                      className={`nav__notifyLink nav__activityButton${partnerActivityActive ? ' is-active' : ''}`}
                      onClick={() => nav('/notifications')}
                      aria-label={`Центр активности${partnerActivityCount ? `: ${partnerActivityCount}` : ''}`}
                      title="Центр активности"
                    >
                      <BellIcon />
                      {partnerActivityCount ? <span className="nav__notifyBadge">{partnerActivityCount}</span> : null}
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="nav__linksPersist">
            {isPublicShowcasePage ? (
              <>
                <Link className="nav__action nav__action--showcaseLogin" to="/auth">
                  Войти
                </Link>
              </>
            ) : (
              <>
                {hasOwnerSession() ? (
                  <>
                    {mode === 'owner' ? (
                      <button
                        type="button"
                        className="nav__ownerGarageLink"
                        onClick={() => setProfileCenterOpen(true)}
                        aria-label="Центр уведомлений и профиля"
                        title="Центр уведомлений"
                      >
                        {owner?.garageAvatar ? (
                          <img alt="" src={resolvePublicMediaUrl(owner.garageAvatar)} className="nav__ownerGarageImg" />
                        ) : (
                          <DefaultAvatar
                            email={String((owner || getSessionOwner())?.email || '').trim()}
                            fallback={String((owner || getSessionOwner())?.name || '').trim()}
                            alt=""
                            className="nav__ownerGarageDefaultImg"
                          />
                        )}
                        {notificationsUnread ? (
                          <span className="nav__notifyBadge nav__notifyBadge--avatar">{notificationsUnread}</span>
                        ) : null}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </nav>
      </div>
      {mode === 'owner' ? (
        <NotificationCenterOverlay
          open={profileCenterOpen}
          owner={owner}
          unreadCount={notificationsUnread}
          onClose={() => setProfileCenterOpen(false)}
          onLogout={logout}
          onUnreadChange={setNotificationsUnread}
        />
      ) : null}
      {mode === 'detailing' ? (
        <PartnerActivityOverlay
          open={partnerActivityOpen}
          pendingClaims={pendingClaims}
          unreadNotifications={notificationsUnread}
          onClose={() => setPartnerActivityOpen(false)}
        />
      ) : null}
    </header>
  )
}

