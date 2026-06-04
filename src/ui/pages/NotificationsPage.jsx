import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { getApi } from '../../api/index.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { fmtDateTime } from '../../lib/format.js'
import { isNativeApp } from '../../lib/nativePlatform.js'
import { syncNotificationBadge } from '../../lib/notificationBadge.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { BackNav, Button, Card, PageLoadSpinner } from '../components.jsx'

function kindLabel(kind) {
  if (kind === 'car_ready') return 'Авто'
  if (kind === 'service_reminder') return 'Напоминание'
  if (kind === 'crm_next_contact') return 'CRM'
  if (kind === 'owner_booking_request') return 'Заявка'
  if (kind === 'owner_booking_request_sent') return 'Запись'
  if (kind === 'detailing_car_add_request') return 'Заявка'
  if (kind === 'admin_broadcast') return 'Сервис'
  if (kind === 'admin_test') return 'Тест'
  return 'Уведомление'
}

function notificationPriority(kind) {
  if (kind === 'owner_booking_request') return 1
  if (kind === 'crm_next_contact') return 2
  return 3
}

function ts(value) {
  const d = value ? new Date(value) : null
  const n = d?.getTime()
  return Number.isFinite(n) ? n : 0
}

function isToday(value) {
  const d = value ? new Date(value) : null
  if (!d || !Number.isFinite(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function notificationMetaItems(n) {
  const data = n?.data && typeof n.data === 'object' ? n.data : {}
  const items = []
  const requestTypeLabel = String(data.requestTypeLabel || '').trim()
  const ownerName = String(data.ownerName || '').trim()
  const carName = String(data.carName || '').trim()
  const nextContactAt = String(data.nextContactAt || '').trim()
  const isCrmAction = n?.kind === 'crm_next_contact' || n?.kind === 'owner_booking_request'

  if (requestTypeLabel) items.push({ label: 'Тип', value: requestTypeLabel })
  if (ownerName) items.push({ label: 'Клиент', value: ownerName })
  if (carName) items.push({ label: 'Авто', value: carName })
  if (!isCrmAction) {
    const ownerPhone = String(data.ownerPhone || '').trim()
    if (ownerPhone) items.push({ label: 'Телефон', value: ownerPhone })
  }
  if (n?.kind === 'crm_next_contact' && nextContactAt) {
    items.push({ label: 'Дата контакта', value: fmtDateTime(nextContactAt) })
  }

  return items
}

function notificationCallPhone(n) {
  const data = n?.data && typeof n.data === 'object' ? n.data : {}
  if (n?.kind !== 'crm_next_contact' && n?.kind !== 'owner_booking_request') return ''
  return String(data.ownerPhone || '').trim()
}

function notificationActionDetails(n) {
  const data = n?.data && typeof n.data === 'object' ? n.data : {}
  if (n?.kind !== 'crm_next_contact' && n?.kind !== 'owner_booking_request') return null
  const requestTypeLabel = String(data.requestTypeLabel || '').trim()
  const ownerName = String(data.ownerName || '').trim()
  const carName = String(data.carName || '').trim()
  const internalNote = String(
    data.internalNote || data.ownerInternalNote || data.clientNote || data.managerNote || data.note || '',
  ).trim()
  const nextContactAt = String(data.nextContactAt || '').trim()

  return {
    title:
      n.kind === 'owner_booking_request'
        ? 'Запись клиента'
        : requestTypeLabel || 'Время от мастера',
    rows: [
      ownerName ? { label: 'Имя владельца', value: ownerName } : null,
      carName ? { label: 'Автомобиль', value: carName } : null,
      internalNote ? { label: 'Внутренний комментарий', value: internalNote } : null,
      n.kind === 'crm_next_contact' && nextContactAt
        ? { label: 'Дата контакта', value: fmtDateTime(nextContactAt) }
        : null,
    ].filter(Boolean),
  }
}

export default function NotificationsPage() {
  const nav = useNavigate()
  const authed = hasOwnerSession() || hasDetailingSession()
  const [payload, setPayload] = useState({ items: [], unread_count: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('new')

  useEffect(() => {
    if (!authed) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const data = await getApi().notifications()
        if (!cancelled) {
          const next = data && typeof data === 'object' ? data : { items: [], unread_count: 0 }
          setPayload(next)
          syncNotificationBadge(Number(next.unread_count || 0))
        }
      } catch (e) {
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить уведомления'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authed])

  const items = useMemo(() => (Array.isArray(payload.items) ? payload.items : []), [payload.items])
  const unread = Number(payload.unread_count || 0)
  const isDetailing = hasDetailingSession()
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => ts(b.createdAt) - ts(a.createdAt))
  }, [items])
  const newItems = useMemo(() => {
    return sortedItems
      .filter((n) => !n.readAt)
      .sort((a, b) => {
        const p = notificationPriority(a.kind) - notificationPriority(b.kind)
        return p || ts(b.createdAt) - ts(a.createdAt)
      })
  }, [sortedItems])
  const readTodayItems = useMemo(() => {
    return sortedItems.filter((n) => n.readAt && isToday(n.readAt))
  }, [sortedItems])
  const archiveItems = sortedItems
  const visibleItems = tab === 'archive' ? archiveItems : tab === 'read' ? readTodayItems : newItems
  const tabs = [
    { id: 'new', label: 'Новые', count: newItems.length },
    { id: 'read', label: 'Прочитанные', count: readTodayItems.length },
    { id: 'archive', label: 'Архив', count: archiveItems.length },
  ]

  if (!authed) return <Navigate to="/auth" replace />

  const markAll = async () => {
    await getApi().notificationsMarkAllRead()
    syncNotificationBadge(0)
    setPayload((p) => ({
      ...p,
      unread_count: 0,
      items: (Array.isArray(p.items) ? p.items : []).map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })),
    }))
  }

  const markRead = async (id) => {
    const wasUnread = items.some((x) => String(x.id) === String(id) && !x.readAt)
    const nextUnread = wasUnread ? Math.max(0, unread - 1) : unread
    setPayload((p) => ({
      ...p,
      unread_count: wasUnread ? Math.max(0, Number(p.unread_count || 0) - 1) : Number(p.unread_count || 0),
      items: (Array.isArray(p.items) ? p.items : []).map((x) =>
        String(x.id) === String(id) ? { ...x, readAt: x.readAt || new Date().toISOString() } : x,
      ),
    }))
    syncNotificationBadge(nextUnread)
    await getApi().notificationMarkRead(id).catch(() => {})
  }

  const clearAll = async () => {
    await getApi().notificationsClear()
    setPayload({ items: [], unread_count: 0 })
    syncNotificationBadge(0)
  }

  const openNotification = async (n) => {
    await markRead(n.id)
    if ((n?.kind === 'crm_next_contact' || n?.kind === 'owner_booking_request') && hasDetailingSession()) {
      const carId = String(n?.data?.carId || '').trim()
      const filter = n?.readAt ? 'all' : 'tasks'
      if (carId) {
        nav(`/detailing/clients?filter=${filter}&id=${encodeURIComponent(carId)}`)
      } else {
        nav(`/detailing/clients?filter=${filter}`)
      }
      return
    }
    if (n?.kind === 'owner_booking_request_sent' && hasOwnerSession()) {
      const carId = String(n?.data?.carId || '').trim()
      const eventId = String(n?.data?.eventId || '').trim()
      if (carId) {
        const suffix = eventId ? `?visit=${encodeURIComponent(eventId)}` : ''
        nav(`/car/${encodeURIComponent(carId)}/history${suffix}`)
      }
      return
    }
    if (n?.kind === 'detailing_car_add_request' && hasOwnerSession()) {
      nav('/requests')
      return
    }
    const detailingId = String(n?.data?.detailingId || '').trim()
    if (!detailingId) return
    if (isNativeApp()) {
      nav('/garage')
      return
    }
    nav(`/d/${encodeURIComponent(detailingId)}`)
  }

  return (
    <main className="container notificationsPage">
      <Seo title="Уведомления · КарПас" description="Внутренние уведомления сервиса КарПас." noindex />
      <div className="row spread gap wrap notificationsPage__head">
        <div className="row gap wrap align-center">
          <BackNav fallbackTo={hasOwnerSession() ? '/garage' : '/detailing'} title="Назад" />
          <div>
            <h1 className="h1" style={{ margin: 0 }}>Уведомления</h1>
          </div>
        </div>
        <div className="row gap wrap">
          {!isDetailing ? (
            <Button variant="ghost" className="btn" disabled={items.length === 0 || loading} onClick={clearAll}>
              Очистить уведомления
            </Button>
          ) : null}
        </div>
      </div>

      <div className="notificationsTabs" role="tablist" aria-label="Фильтр уведомлений">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            className={`notificationsTab${tab === x.id ? ' is-active' : ''}`}
            onClick={() => setTab(x.id)}
          >
            <span>{x.label}</span>
            <span className="notificationsTab__count">{x.count}</span>
          </button>
        ))}
        <button
          type="button"
          className="notificationsTab notificationsTab--markAll"
          disabled={!unread || loading}
          onClick={markAll}
        >
          <span>Прочитать все</span>
          <span className="notificationsTab__count">{unread}</span>
        </button>
      </div>

      {loading ? <PageLoadSpinner label="Загрузка уведомлений..." /> : null}
      {err ? <Card className="pad notificationsPage__state"><p className="adminSupportErr">{err}</p></Card> : null}
      {!loading && !err && visibleItems.length === 0 ? (
        <Card className="pad notificationsPage__state">
          <h2 className="h2">{tab === 'new' ? 'Новых нет' : tab === 'read' ? 'Сегодня пока пусто' : 'Архив пуст'}</h2>
          <p className="muted">
            {tab === 'new'
              ? 'Здесь появятся новые заявки владельцев, рекомендованное время контакта и сервисные уведомления.'
              : tab === 'read'
                ? 'Здесь будут заявки и уведомления, которые менеджер открыл или закрыл сегодня.'
                : 'Здесь будет история заявок и уведомлений от последних к более ранним.'}
          </p>
        </Card>
      ) : null}

      <div className="notificationsList">
        {visibleItems.map((n) => {
          const unreadItem = !n.readAt
          const metaItems = notificationMetaItems(n)
          const callPhone = notificationCallPhone(n)
          const actionDetails = notificationActionDetails(n)
          return (
            <Card
              key={n.id}
              className={`notificationsItem${unreadItem ? ' notificationsItem--unread' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => void openNotification(n)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  void openNotification(n)
                }
              }}
            >
              <div className="notificationsItem__top">
                <span className="notificationsItem__kind">{kindLabel(n.kind)}</span>
                <span className="muted small">{fmtDateTime(n.createdAt)}</span>
              </div>
              <h2 className="notificationsItem__title">
                {actionDetails?.title || n.title || 'Уведомление'}
              </h2>
              {actionDetails ? (
                <div className="notificationsItem__details" aria-label="Детали заявки">
                  {actionDetails.rows.map((item) => (
                    <p key={`${item.label}-${item.value}`} className="notificationsItem__detailRow">
                      <span>{item.label}:</span> {item.value}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="notificationsItem__body">{n.body}</p>
              )}
              {!actionDetails && metaItems.length ? (
                <div className="notificationsItem__meta" aria-label="Детали уведомления">
                  {metaItems.map((item) => (
                    <span key={`${item.label}-${item.value}`} className="notificationsItem__metaItem">
                      <span>{item.label}:</span> {item.value}
                    </span>
                  ))}
                </div>
              ) : null}
              {callPhone ? (
                <a
                  className="link notificationsItem__callBtn"
                  href={`tel:${callPhone.replace(/[^\d+]/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Позвонить
                </a>
              ) : null}
              {unreadItem ? (
                <button
                  type="button"
                  className="btn notificationsItem__readBtn"
                  data-variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    void markRead(n.id)
                  }}
                >
                  Отметить прочитанным
                </button>
              ) : null}
            </Card>
          )
        })}
      </div>
    </main>
  )
}
