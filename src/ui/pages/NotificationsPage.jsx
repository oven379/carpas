import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { getApi } from '../../api/index.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { fmtDateTime } from '../../lib/format.js'
import { isNativeApp } from '../../lib/nativePlatform.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { BackNav, Button, Card, PageLoadSpinner } from '../components.jsx'

function kindLabel(kind) {
  if (kind === 'car_ready') return 'Авто'
  if (kind === 'service_reminder') return 'Напоминание'
  if (kind === 'admin_broadcast') return 'Сервис'
  if (kind === 'admin_test') return 'Тест'
  return 'Уведомление'
}

function postNativeBadgeCount(count) {
  try {
    if (typeof window === 'undefined' || !window.ReactNativeWebView?.postMessage) return
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'carpas-notification-badge', count: Math.max(0, Number(count || 0)) }),
    )
  } catch {
    // Native badge sync is optional.
  }
}

export default function NotificationsPage() {
  const nav = useNavigate()
  const authed = hasOwnerSession() || hasDetailingSession()
  const [payload, setPayload] = useState({ items: [], unread_count: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const data = await getApi().notifications()
        if (!cancelled) {
          const next = data && typeof data === 'object' ? data : { items: [], unread_count: 0 }
          setPayload(next)
          postNativeBadgeCount(Number(next.unread_count || 0))
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
  }, [])

  if (!authed) return <Navigate to="/auth" replace />

  const items = Array.isArray(payload.items) ? payload.items : []
  const unread = Number(payload.unread_count || 0)

  const markAll = async () => {
    await getApi().notificationsMarkAllRead()
    postNativeBadgeCount(0)
    setPayload((p) => ({
      ...p,
      unread_count: 0,
      items: (Array.isArray(p.items) ? p.items : []).map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })),
    }))
  }

  const markRead = async (id) => {
    setPayload((p) => ({
      ...p,
      unread_count: Math.max(0, Number(p.unread_count || 0) - 1),
      items: (Array.isArray(p.items) ? p.items : []).map((x) =>
        String(x.id) === String(id) ? { ...x, readAt: x.readAt || new Date().toISOString() } : x,
      ),
    }))
    postNativeBadgeCount(Math.max(0, Number(payload.unread_count || 0) - 1))
    await getApi().notificationMarkRead(id).catch(() => {})
  }

  const clearAll = async () => {
    await getApi().notificationsClear()
    setPayload({ items: [], unread_count: 0 })
    postNativeBadgeCount(0)
  }

  const openNotification = async (n) => {
    await markRead(n.id)
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
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              {unread > 0 ? `Новых: ${unread}` : 'Новых уведомлений нет'}
            </p>
          </div>
        </div>
        <div className="row gap wrap">
          <Button variant="outline" className="btn" disabled={!unread || loading} onClick={markAll}>
            Прочитать все
          </Button>
          <Button variant="ghost" className="btn" disabled={items.length === 0 || loading} onClick={clearAll}>
            Очистить уведомления
          </Button>
        </div>
      </div>

      {loading ? <PageLoadSpinner label="Загрузка уведомлений..." /> : null}
      {err ? <Card className="pad notificationsPage__state"><p className="adminSupportErr">{err}</p></Card> : null}
      {!loading && !err && items.length === 0 ? (
        <Card className="pad notificationsPage__state">
          <h2 className="h2">Пока пусто</h2>
          <p className="muted">Здесь появятся сообщения от сервиса, напоминания и уведомления от детейлинга.</p>
        </Card>
      ) : null}

      <div className="notificationsList">
        {items.map((n) => {
          const unreadItem = !n.readAt
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
              <h2 className="notificationsItem__title">{n.title || 'Уведомление'}</h2>
              <p className="notificationsItem__body">{n.body}</p>
              {unreadItem ? (
                <button
                  type="button"
                  className="link notificationsItem__readBtn"
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
