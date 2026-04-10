import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getApi } from '../../api/index.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { useDetailing } from '../useDetailing.js'
import { useRepo } from '../useRepo.js'
import { Button, Field, Input, Textarea } from '../components.jsx'
import { SupportContext } from './supportContext.js'
import { supportPageTitle } from './supportPageTitle.js'
import { useSupport } from './useSupport.js'

async function buildSupportContext(r, { pathname, mode, detailingId, detailing, carId }) {
  const page_title = supportPageTitle(pathname)
  const href = typeof location !== 'undefined' ? location.href : ''
  const base = { pathname, href, page_title }

  if (mode === 'owner' && hasOwnerSession()) {
    try {
      const [cars, me] = await Promise.all([r.listCars(), r.getMeOwner()])
      const oc = me?.owner
      let carHint = null
      if (carId && r.getCar) {
        try {
          const car = await r.getCar(carId)
          if (car && typeof car === 'object') {
            carHint = {
              id: String(carId),
              make: car.make,
              model: car.model,
              vin: car.vin || null,
            }
          }
        } catch {
          /* ignore */
        }
      }
      return {
        ...base,
        role: 'owner',
        email: oc?.email,
        garage_slug: oc?.garage_slug,
        cars_count: Array.isArray(cars) ? cars.length : null,
        car: carHint,
      }
    } catch {
      return { ...base, role: 'owner' }
    }
  }

  if (mode === 'detailing' && detailing) {
    return {
      ...base,
      role: 'detailing',
      detailing_id: detailingId,
      detailing_name: detailing.name,
      email: detailing.email,
    }
  }

  return { ...base, role: 'guest' }
}

export function SupportProvider({ children }) {
  const loc = useLocation()
  const r = useRepo()
  const { mode, detailingId, detailing } = useDetailing()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalOpts, setModalOpts] = useState(() => ({}))

  const [unreadCount, setUnreadCount] = useState(0)
  const [previewTicket, setPreviewTicket] = useState(null)

  const [body, setBody] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formOk, setFormOk] = useState(false)

  const overlayRef = useRef(null)
  const attachmentInputRef = useRef(null)
  const attachmentInputId = useId()
  const pollRef = useRef(0)

  const canPoll = hasOwnerSession() || hasDetailingSession()

  const refreshUnread = useCallback(async () => {
    if (!canPoll) {
      setUnreadCount(0)
      setPreviewTicket(null)
      return
    }
    const api = getApi()
    try {
      const c = await api.supportUnreadCount()
      const n = Number(c?.unread_count) || 0
      setUnreadCount(n)
      if (n > 0) {
        const inbox = await api.supportInbox()
        const list = Array.isArray(inbox) ? inbox : []
        const u = list.find((t) => t?.has_unread_reply)
        setPreviewTicket(u || null)
      } else {
        setPreviewTicket(null)
      }
    } catch {
      /* сеть / 401 — тихо */
    }
  }, [canPoll])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread, loc.pathname, r._version])

  useEffect(() => {
    if (!canPoll) return undefined
    pollRef.current = window.setInterval(() => void refreshUnread(), 45000)
    return () => window.clearInterval(pollRef.current)
  }, [canPoll, refreshUnread])

  const openModal = useCallback((opts = {}) => {
    setModalOpts(opts)
    setModalOpen(true)
    setFormError('')
    setFormOk(false)
    setBody(opts.bodyPrefix ? String(opts.bodyPrefix) : '')
    setGuestEmail('')
    setFile(null)
    void refreshUnread()
  }, [refreshUnread])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setModalOpts({})
  }, [])

  const dismissReply = useCallback(async () => {
    if (!previewTicket?.id) {
      closeModal()
      return
    }
    try {
      await getApi().supportMarkRead(previewTicket.id)
      await refreshUnread()
    } catch {
      /* ignore */
    }
  }, [previewTicket, refreshUnread, closeModal])

  useEffect(() => {
    if (!modalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  const onBackdrop = (e) => {
    if (e.target === overlayRef.current) closeModal()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormOk(false)
    const text = String(body || '').trim()
    if (text.length < 3) {
      setFormError('Опишите вопрос или предложение (не меньше 3 символов).')
      return
    }
    const authed = hasOwnerSession() || hasDetailingSession()
    const em = String(guestEmail || '').trim()
    if (!authed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormError('Укажите корректный e-mail для ответа.')
      return
    }

    setSubmitting(true)
    try {
      const api = getApi()
      const carId = modalOpts.carId || null
      const baseContext = await buildSupportContext(r, {
        pathname: loc.pathname,
        mode,
        detailingId,
        detailing,
        carId,
      })
      const context =
        modalOpts.contextExtra && typeof modalOpts.contextExtra === 'object'
          ? { ...baseContext, ...modalOpts.contextExtra }
          : baseContext
      await api.createSupportTicket({
        body: text,
        page_path: loc.pathname || '/',
        page_title: supportPageTitle(loc.pathname),
        context,
        guest_email: authed ? undefined : em,
        attachment: file instanceof File ? file : undefined,
      })
      setFormOk(true)
      setBody('')
      setGuestEmail('')
      setFile(null)
      await refreshUnread()
    } catch (err) {
      setFormError(formatHttpErrorMessage(err, 'Не удалось отправить обращение.'))
    } finally {
      setSubmitting(false)
    }
  }

  const value = useMemo(
    () => ({
      openModal,
      closeModal,
      unreadCount,
      refreshUnread,
      previewTicket,
    }),
    [openModal, closeModal, unreadCount, refreshUnread, previewTicket],
  )

  const showReplyCard = Boolean(previewTicket?.admin_reply && previewTicket?.has_unread_reply)

  return (
    <SupportContext.Provider value={value}>
      {children}
      {modalOpen ? (
        <div
          className="supportModalOverlay"
          ref={overlayRef}
          role="presentation"
          onMouseDown={onBackdrop}
        >
          <div
            className="supportModal card pad"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="supportModal__head row spread gap wrap">
              <h2 id="support-modal-title" className="h2 supportModal__title">
                Поддержка КарПас
              </h2>
              <button type="button" className="btn" data-variant="ghost" onClick={closeModal} aria-label="Закрыть">
                ×
              </button>
            </div>
            <p className="muted small supportModal__lead">
              Опишите проблему, вопрос или идею. Мы ответим на указанный e-mail (для гостей) или покажем ответ здесь, если вы
              вошли в аккаунт.
            </p>

            {showReplyCard ? (
              <div className="supportAdminReply">
                <div className="supportAdminReply__label">Ответ поддержки</div>
                <p className="supportAdminReply__meta muted small">
                  {previewTicket.admin_replied_at
                    ? new Date(previewTicket.admin_replied_at).toLocaleString('ru-RU')
                    : null}
                </p>
                <div className="supportAdminReply__text">{previewTicket.admin_reply}</div>
                <div className="supportAdminReply__actions row gap wrap">
                  <Button type="button" variant="primary" onClick={() => void dismissReply()}>
                    Спасибо, прочитал
                  </Button>
                </div>
              </div>
            ) : null}

            {formOk ? (
              <p className="supportModal__ok muted small" role="status">
                Сообщение отправлено. Спасибо! Мы свяжемся с вами при необходимости.
              </p>
            ) : null}

            <form className="supportModal__form" onSubmit={(e) => void onSubmit(e)}>
              {!hasOwnerSession() && !hasDetailingSession() ? (
                <Field label="Ваш e-mail" hint="чтобы ответить на обращение">
                  <Input
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
              ) : null}
              <Field label="Текст обращения" hint="можно приложить скриншот">
                <Textarea
                  className="input"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Что случилось или что хотите предложить?"
                  style={{ resize: 'vertical', minHeight: 120 }}
                />
              </Field>
              <Field
                className="field--full"
                label="Вложение"
                hint="JPEG, PNG, WebP, GIF — один файл, как при загрузке документов в кабинете"
              >
                <div className="filePick" style={{ margin: 0 }}>
                  <input
                    id={attachmentInputId}
                    ref={attachmentInputRef}
                    className="srOnly"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null)
                      e.target.value = ''
                    }}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="btn filePick__btn"
                    data-variant="outline"
                    onClick={() => attachmentInputRef.current?.click?.()}
                    disabled={submitting}
                  >
                    Выбрать файл
                  </button>
                  <span className="filePick__status" title={file ? file.name : undefined}>
                    {!file ? 'Файл не выбран' : file.name || 'Выбран файл'}
                  </span>
                </div>
              </Field>
              {formError ? (
                <p className="supportModal__err small" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="supportModal__submitRow">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Отправка…' : 'Отправить'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </SupportContext.Provider>
  )
}

/** Кнопка «Поддержка» с бейджем непрочитанного ответа (футер, контекстные блоки на страницах). */
export function SupportButton({ className = '', children, openOptions, onClick, ...rest }) {
  const { openModal, unreadCount } = useSupport()
  return (
    <button
      type="button"
      className={className.trim()}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) openModal(openOptions ?? {})
      }}
    >
      <span className="supportBtn__inner">
        <span className="supportBtn__label">{children || 'Поддержка'}</span>
        {unreadCount > 0 ? (
          <span className="supportUnreadBadge" title="Есть ответ поддержки" aria-label={`Непрочитанных ответов: ${unreadCount}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  )
}
