import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { Button, Card, Field, Input, Pill, Textarea } from '../components.jsx'
import { clearAdminMockSession } from '../../lib/adminMockSession.js'
import { clearAdminApiToken, getAdminApiToken, hasAdminApiToken } from '../../lib/adminApiSession.js'
import { getApi } from '../../api/index.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { OPEN_SERVICE_ABOUT_STATE } from '../../lib/serviceLandingNav.js'
import { publicDetailingPath } from '../serviceLinkUi.js'

const NAV = [
  { id: 'dash', label: 'Статистика' },
  { id: 'support', label: 'Поддержка', badgeTone: 'urgent', badgeFrom: (o) => o?.support?.awaitingAdminReply ?? 0 },
  { id: 'partners', label: 'Партнёры и заявки', badgeTone: 'pending', badgeFrom: (o) => o?.partners?.pendingVerification ?? 0 },
  { id: 'users', label: 'Пользователи' },
  { id: 'cars', label: 'Автомобили' },
  { id: 'push', label: 'Push-уведомления' },
]

function AdminDetailModal({ open, title, loading, err, onClose, children }) {
  if (!open) return null
  return (
    <div
      className="adminModalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="adminModal card pad" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
        <div className="row spread gap wrap" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <h2 id="adminModalTitle" className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            {title}
          </h2>
          <button type="button" className="btn" data-variant="ghost" onClick={onClose} aria-label="Закрыть">
            Закрыть
          </button>
        </div>
        {err ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 10 }}>
            {err}
          </p>
        ) : null}
        {loading ? <p className="muted small">Загрузка…</p> : children}
      </div>
    </div>
  )
}

/** @param {{ monthLabels: string[], series: { name: string, color: string, values: number[] }[] }} props */
function MultiLineMonthlyChart({ monthLabels, series }) {
  const W = 420
  const H = 200
  const padL = 44
  const padR = 12
  const padT = 16
  const padB = 36
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const labels = Array.isArray(monthLabels) && monthLabels.length ? monthLabels : ['—']
  const safeSeries = Array.isArray(series) ? series.filter((s) => s && Array.isArray(s.values)) : []
  const maxV = Math.max(1, ...safeSeries.flatMap((s) => s.values))
  const n = labels.length
  const xAt = (i) => padL + (innerW * i) / Math.max(n - 1, 1)
  const yAt = (v) => padT + innerH - (innerH * v) / maxV

  return (
    <div className="adminChart">
      <div className="adminChart__head row spread gap wrap">
        <h2 className="h2 adminPreview__panelTitle">Динамика по месяцам</h2>
        <Pill>из базы</Pill>
      </div>
      <p className="muted small adminChart__explain">
        Обращения в поддержку и новые регистрации партнёрских аккаунтов за последние полные месяцы (по дате создания записи).
      </p>
      <svg className="adminChart__svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t)
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} className="adminChart__gridLine" />
            </g>
          )
        })}
        {labels.map((label, i) => (
          <text key={`${label}-${i}`} x={xAt(i)} y={H - 10} textAnchor="middle" className="adminChart__monthLabel">
            {label}
          </text>
        ))}
        {safeSeries.map((s) => {
          const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
          return (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={pts}
              className="adminChart__line"
            />
          )
        })}
        {safeSeries.map((s) =>
          s.values.map((v, i) => (
            <circle key={`${s.name}-${i}`} cx={xAt(i)} cy={yAt(v)} r="4" fill={s.color} className="adminChart__dot" />
          )),
        )}
      </svg>
      <ul className="adminChart__legend">
        {safeSeries.map((s) => (
          <li key={s.name}>
            <span className="adminChart__legendSwatch" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PanelDash({ hasApiToken, overview, overviewLoading, overviewErr, onRetry }) {
  if (!hasApiToken) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Статистика
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Общая статистика сервиса подтягивается из API после входа с учётными данными{' '}
          <code className="adminMono">ADMIN_SUPPORT_LOGIN</code> / <code className="adminMono">ADMIN_SUPPORT_PASSWORD</code>{' '}
          на сервере. Локальный вход в макет без API не показывает числа из базы.
        </p>
      </Card>
    )
  }

  if (overviewLoading && !overview) {
    return <p className="muted small">Загрузка статистики…</p>
  }

  if (overviewErr) {
    return (
      <Card className="card pad">
        <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
          {overviewErr}
        </p>
        <button type="button" className="btn" data-variant="outline" onClick={onRetry}>
          Повторить
        </button>
      </Card>
    )
  }

  if (!overview) {
    return null
  }

  const s = overview.support || {}
  const p = overview.partners || {}
  const r = overview.registry || {}
  const push = overview.push || {}
  const months = Array.isArray(overview.chart?.months) ? overview.chart.months : []
  const monthLabels = months.map((m) => m.label || m.key || '—')
  const chartSeries = [
    {
      name: 'Обращения в поддержку',
      color: '#9333ea',
      values: months.map((m) => Number(m.supportTickets) || 0),
    },
    {
      name: 'Новые аккаунты партнёров',
      color: '#0ea5e9',
      values: months.map((m) => Number(m.newPartnerAccounts) || 0),
    },
  ]

  const kpi = [
    { k: 'Обращения без ответа', v: String(s.awaitingAdminReply ?? 0), d: 'ожидают ответа администратора' },
    { k: 'Обращения за 7 дней', v: String(s.createdLast7Days ?? 0), d: 'создано за последнюю неделю' },
    { k: 'Всего обращений', v: String(s.total ?? 0), d: 'все тикеты в базе' },
    { k: 'Заявки партнёров', v: String(p.pendingVerification ?? 0), d: 'на проверке (email ≠ служебный)' },
    { k: 'Подтверждённых партнёров', v: String(p.approvedTotal ?? 0), d: 'аккаунты с подтверждением' },
    { k: 'Владельцев', v: String(r.ownersTotal ?? 0), d: 'зарегистрированных аккаунтов' },
    { k: 'Автомобилей', v: String(r.carsTotal ?? 0), d: 'записей в таблице машин' },
    { k: 'События в истории (30 дн.)', v: String(r.carEventsLast30Days ?? 0), d: 'записи визитов и т.п.' },
    { k: 'Push-токены', v: String(push.deviceTokensTotal ?? 0), d: `FCM: ${push.fcmConfigured ? 'ок' : 'не настроен'}` },
  ]

  return (
    <>
      <p className="muted small" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
        Общая статистика сервиса: обращения, партнёры, реестр, push. Детальные списки — в соответствующих разделах меню.
      </p>
      <div className="adminPreview__kpiGrid">
        {kpi.map((x) => (
          <Card key={x.k} className="adminPreview__kpi card pad">
            <div className="muted" style={{ fontSize: 12 }}>
              {x.k}
            </div>
            <div className="adminPreview__kpiVal">{x.v}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {x.d}
            </div>
          </Card>
        ))}
      </div>
      <Card className="card pad adminPreview__chartCard">
        <MultiLineMonthlyChart monthLabels={monthLabels} series={chartSeries} />
      </Card>
    </>
  )
}

function formatSupportFrom(f) {
  if (!f || typeof f !== 'object') return '—'
  if (f.role === 'owner') {
    return `Владелец · ${f.email || '—'}${f.garage_slug ? ` · публичный гараж: ${f.garage_slug}` : ''}${f.is_premium ? ' · в аккаунте: Premium' : ''}`
  }
  if (f.role === 'detailing') {
    return `Партнёр · ${f.name || '—'} · ${f.email || '—'}`
  }
  return `Гость · ${f.email || '—'}`
}

function supportContextLine(ctx) {
  if (!ctx || typeof ctx !== 'object') return '—'
  const parts = []
  if (ctx.page_title) parts.push(String(ctx.page_title))
  if (ctx.premium_account_request || ctx.request_type === 'premium_garage') {
    parts.push('тип: заявка на Premium-аккаунт (расширение гаража)')
  }
  if (ctx.request_type === 'garage_limit') parts.push('запрос: лимит гаража')
  if (ctx.role === 'owner') {
    if (ctx.cars_count != null) parts.push(`авто в гараже: ${ctx.cars_count}`)
    if (ctx.garage_slug) parts.push(`слаг: ${ctx.garage_slug}`)
    if (ctx.car?.make) parts.push(`машина: ${ctx.car.make} ${ctx.car.model || ''}`.trim())
  }
  if (ctx.role === 'detailing' && ctx.detailing_name) parts.push(String(ctx.detailing_name))
  return parts.length ? parts.join(' · ') : '—'
}

function PanelSupport({ onTicketPipelineChanged }) {
  const token = getAdminApiToken()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [replyDraft, setReplyDraft] = useState(() => ({}))
  const [replyBusy, setReplyBusy] = useState(null)

  const reload = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const t = getAdminApiToken()
    const list = await getApi().adminSupportTickets(t)
    setItems(Array.isArray(list) ? list : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasAdminApiToken()) {
      setLoading(false)
      setItems([])
      return undefined
    }
    setLoading(true)
    setErr('')
    ;(async () => {
      try {
        await reload()
      } catch (e) {
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить обращения.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, reload])

  if (!hasAdminApiToken()) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Обращения в поддержку
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Раздел доступен после входа с учётными данными из <code className="adminMono">ADMIN_SUPPORT_LOGIN</code> /{' '}
          <code className="adminMono">ADMIN_SUPPORT_PASSWORD</code> на сервере — тогда сохраняется токен API и список
          подтягивается из БД. Локальный макет без API по-прежнему пускает в панель, но тикеты здесь не загрузятся.
        </p>
      </Card>
    )
  }

  return (
    <div className="adminPreview__stack">
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Обращения в поддержку
          </h2>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setErr('')
                setLoading(true)
                try {
                  await reload()
                } catch (e) {
                  setErr(formatHttpErrorMessage(e, 'Не удалось обновить.'))
                } finally {
                  setLoading(false)
                }
              })()
            }
          >
            Обновить
          </button>
        </div>
        <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
          Уведомления о новых обращениях — счётчик в боковом меню у пункта «Поддержка» (обращения без ответа администратора). Здесь
          полный список и отправка ответа пользователю.
        </p>
        {err ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
            {err}
          </p>
        ) : null}
        {loading ? <p className="muted small">Загрузка…</p> : null}
        {!loading && items.length === 0 ? <p className="muted small">Пока нет обращений.</p> : null}
        <ul className="adminSupportList">
          {items.map((row) => {
            const id = row.id
            const open = expanded === id
            return (
              <li key={id} className="adminSupportCard card pad">
                <button
                  type="button"
                  className="adminSupportCard__head"
                  onClick={() => setExpanded(open ? null : id)}
                  aria-expanded={open}
                >
                  <span className="adminSupportCard__id">#{id}</span>
                  {row.context?.premium_account_request || row.context?.request_type === 'premium_garage' ? (
                    <Pill tone="accent">Premium</Pill>
                  ) : null}
                  <span className="adminSupportCard__from">{formatSupportFrom(row.from)}</span>
                  <span className="adminSupportCard__chev" aria-hidden>
                    {open ? '▼' : '▶'}
                  </span>
                </button>
                <div className="muted small adminSupportCard__path">
                  <code className="adminMono">{row.page_path || '—'}</code>
                  {row.page_title ? <span> · {row.page_title}</span> : null}
                </div>
                <div className="muted small adminSupportCard__ctx">{supportContextLine(row.context)}</div>
                {open ? (
                  <div className="adminSupportCard__body">
                    <div className="adminSupportCard__block">
                      <div className="adminSupportCard__label">Сообщение</div>
                      <div className="adminSupportCard__text">{row.body}</div>
                    </div>
                    {row.attachment_url ? (
                      <div className="adminSupportCard__block">
                        <div className="adminSupportCard__label">Вложение</div>
                        <a className="link" href={row.attachment_url} target="_blank" rel="noopener noreferrer">
                          Открыть файл
                        </a>
                      </div>
                    ) : null}
                    {row.admin_reply ? (
                      <div className="adminSupportCard__block adminSupportCard__block--reply">
                        <div className="adminSupportCard__label">Ответ администратора</div>
                        <div className="adminSupportCard__text">{row.admin_reply}</div>
                        {row.admin_replied_at ? (
                          <div className="muted small">{new Date(row.admin_replied_at).toLocaleString('ru-RU')}</div>
                        ) : null}
                      </div>
                    ) : null}
                    <Field label="Ответ пользователю" className="field--full" hint="после отправки ответ появится в приложении">
                      <Textarea
                        className="input"
                        rows={4}
                        value={replyDraft[id] || ''}
                        onChange={(e) => setReplyDraft((d) => ({ ...d, [id]: e.target.value }))}
                        style={{ resize: 'vertical', minHeight: 88 }}
                      />
                    </Field>
                    <button
                      type="button"
                      className="btn"
                      data-variant="primary"
                      disabled={replyBusy === id || !String(replyDraft[id] || '').trim()}
                      onClick={() =>
                        void (async () => {
                          const msg = String(replyDraft[id] || '').trim()
                          if (!msg) return
                          setReplyBusy(id)
                          setErr('')
                          try {
                            await getApi().adminSupportReply(getAdminApiToken(), id, msg)
                            setReplyDraft((d) => ({ ...d, [id]: '' }))
                            await reload()
                            onTicketPipelineChanged?.()
                          } catch (e) {
                            setErr(formatHttpErrorMessage(e, 'Не удалось отправить ответ.'))
                          } finally {
                            setReplyBusy(null)
                          }
                        })()
                      }
                    >
                      {replyBusy === id ? 'Отправка…' : 'Отправить ответ'}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function PanelPush() {
  const token = getAdminApiToken()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsErr, setStatsErr] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [sendBusy, setSendBusy] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const [sendOk, setSendOk] = useState('')

  const loadStats = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const s = await getApi().adminPushStats(getAdminApiToken())
    setStats(s && typeof s === 'object' ? s : null)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasAdminApiToken()) {
      setStatsLoading(false)
      setStats(null)
      return undefined
    }
    setStatsLoading(true)
    setStatsErr('')
    ;(async () => {
      try {
        await loadStats()
      } catch (e) {
        if (!cancelled) setStatsErr(formatHttpErrorMessage(e, 'Не удалось загрузить статистику push.'))
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, loadStats])

  if (!hasAdminApiToken()) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Push-уведомления
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Раздел доступен после входа с учётными данными из <code className="adminMono">ADMIN_SUPPORT_LOGIN</code> /{' '}
          <code className="adminMono">ADMIN_SUPPORT_PASSWORD</code> — тогда сохраняется токен API и рассылка идёт через FCM
          на зарегистрированные устройства приложения.
        </p>
      </Card>
    )
  }

  const fcmOk = stats?.fcm_configured === true

  return (
    <div className="adminPreview__stack">
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Push-уведомления
          </h2>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={statsLoading}
            onClick={() =>
              void (async () => {
                setStatsErr('')
                setStatsLoading(true)
                try {
                  await loadStats()
                } catch (e) {
                  setStatsErr(formatHttpErrorMessage(e, 'Не удалось обновить.'))
                } finally {
                  setStatsLoading(false)
                }
              })()
            }
          >
            Обновить
          </button>
        </div>
        {statsErr ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
            {statsErr}
          </p>
        ) : null}
        {!fcmOk && !statsLoading ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
            FCM не настроен на сервере: задайте <code className="adminMono">FIREBASE_PROJECT_ID</code> и JSON сервисного
            аккаунта (см. <code className="adminMono">backend/.env.example</code>). Рассылка вернёт ошибку 503, пока это не
            сделано.
          </p>
        ) : null}
        {statsLoading ? (
          <p className="muted small" style={{ marginBottom: 16 }}>
            Загрузка…
          </p>
        ) : stats ? (
          <ul className="muted small" style={{ margin: '0 0 16px', paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Всего токенов: {stats.total ?? '—'}</li>
            <li>Владельцы: {stats.owners ?? '—'} · Партнёры (детейлинг): {stats.detailings ?? '—'}</li>
            <li>Android: {stats.android ?? '—'} · iOS: {stats.ios ?? '—'}</li>
            <li>FCM: {fcmOk ? 'настроен' : 'не настроен'}</li>
          </ul>
        ) : null}

        <Field label="Заголовок" className="field--full" hint="до 120 символов">
          <Input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Например: Обновление сервиса"
          />
        </Field>
        <Field label="Текст" className="field--full" hint="до 2000 символов">
          <Textarea
            className="input"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            style={{ resize: 'vertical', minHeight: 100 }}
            placeholder="Краткое сообщение для пользователей"
          />
        </Field>
        <Field label="Аудитория" className="field--full">
          <select
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            style={{ width: '100%', maxWidth: 360 }}
          >
            <option value="all">Все зарегистрированные устройства</option>
            <option value="owners">Только владельцы</option>
            <option value="detailings">Только партнёры (детейлинг)</option>
          </select>
        </Field>
        {sendErr ? (
          <p className="adminSupportErr small" role="alert" style={{ marginTop: 12 }}>
            {sendErr}
          </p>
        ) : null}
        {sendOk ? (
          <p className="muted small" style={{ marginTop: 12 }}>
            {sendOk}
          </p>
        ) : null}
        <div style={{ marginTop: 14 }}>
          <Button
            variant="primary"
            disabled={sendBusy || !String(title).trim() || !String(body).trim()}
            onClick={() =>
              void (async () => {
                setSendErr('')
                setSendOk('')
                setSendBusy(true)
                try {
                  const res = await getApi().adminPushBroadcast(getAdminApiToken(), {
                    title: String(title).trim(),
                    body: String(body).trim(),
                    audience,
                  })
                  if (res && res.ok === false) {
                    setSendErr(String(res.message || 'Отправка не выполнена.'))
                    return
                  }
                  if (res?.sent != null) {
                    setSendOk(
                      `Отправлено: ${res.sent}, ошибок: ${res.failed ?? 0}` +
                        (res.message ? `. ${res.message}` : ''),
                    )
                  } else {
                    setSendOk('Запрос выполнен.')
                  }
                  await loadStats()
                } catch (e) {
                  setSendOk('')
                  setSendErr(formatHttpErrorMessage(e, 'Не удалось отправить рассылку.'))
                } finally {
                  setSendBusy(false)
                }
              })()
            }
          >
            {sendBusy ? 'Отправка…' : 'Отправить push'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function PanelUsers() {
  const token = getAdminApiToken()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalId, setModalId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')
  const [detail, setDetail] = useState(null)

  const reload = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const res = await getApi().adminRegistryOwners(getAdminApiToken())
    setItems(res && typeof res === 'object' && Array.isArray(res.items) ? res.items : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasAdminApiToken()) {
      setLoading(false)
      setItems([])
      return undefined
    }
    setLoading(true)
    setErr('')
    ;(async () => {
      try {
        await reload()
      } catch (e) {
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить пользователей.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, reload])

  const openOwner = (id) => {
    setModalId(String(id))
    setModalOpen(true)
    setDetail(null)
    setDetailErr('')
    setDetailLoading(true)
    void (async () => {
      try {
        const d = await getApi().adminRegistryOwner(getAdminApiToken(), id)
        setDetail(d && typeof d === 'object' ? d : null)
      } catch (e) {
        setDetailErr(formatHttpErrorMessage(e, 'Не удалось загрузить карточку пользователя.'))
      } finally {
        setDetailLoading(false)
      }
    })()
  }

  if (!hasAdminApiToken()) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Пользователи
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Список владельцев (аккаунтов) и статистика доступны после входа с <code className="adminMono">ADMIN_SUPPORT_*</code> на сервере.
        </p>
      </Card>
    )
  }

  const st = detail?.stats || {}

  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Владельцы приложения: почта, гараж, число машин и обращений в поддержку. Кнопка «Просмотр» открывает сводную статистику по аккаунту.
        </p>
      </Card>
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Пользователи
          </h2>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setErr('')
                setLoading(true)
                try {
                  await reload()
                } catch (e) {
                  setErr(formatHttpErrorMessage(e, 'Не удалось обновить.'))
                } finally {
                  setLoading(false)
                }
              })()
            }
          >
            Обновить
          </button>
        </div>
        {err ? (
          <p className="adminSupportErr small" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? <p className="muted small">Загрузка…</p> : null}
        {!loading && items.length === 0 ? <p className="muted small">Пока нет записей.</p> : null}
        {!loading && items.length > 0 ? (
          <div className="adminPreview__tableWrap">
            <table className="adminPreview__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Авто</th>
                  <th>Тикеты</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <code className="adminMono">{u.id}</code>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.name || '—'}</td>
                    <td>{u.carsCount ?? 0}</td>
                    <td>{u.supportTicketsCount ?? 0}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn" data-variant="outline" onClick={() => openOwner(u.id)}>
                        Просмотр
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
      <AdminDetailModal
        open={modalOpen}
        title={`Пользователь #${modalId}`}
        loading={detailLoading}
        err={detailErr}
        onClose={() => {
          setModalOpen(false)
          setDetail(null)
        }}
      >
        {detail?.owner ? (
          <div className="adminDetailBody">
            <p style={{ margin: '0 0 8px' }}>
              <strong>{detail.owner.email}</strong>
              {detail.owner.name ? <span className="muted"> · {detail.owner.name}</span> : null}
            </p>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              Телефон: {detail.owner.phone || '—'} · Premium: {detail.owner.isPremium ? 'да' : 'нет'} · Слаг гаража:{' '}
              {detail.owner.garageSlug || '—'}
            </p>
            <ul className="muted small adminDetailStatList">
              <li>Автомобилей в гараже: {st.carsTotal ?? 0}</li>
              <li>Событий в истории (по машинам): {st.carEventsTotal ?? 0}</li>
              <li>Документов: {st.carDocsTotal ?? 0}</li>
              <li>Обращений в поддержку: {st.supportTicketsTotal ?? 0}</li>
              <li>Без ответа администратора: {st.supportTicketsAwaitingAdminReply ?? 0}</li>
            </ul>
            {detail.owner.garageSlug ? (
              <div style={{ marginTop: 14 }}>
                <Link className="btn" data-variant="ghost" to={`/g/${encodeURIComponent(detail.owner.garageSlug)}`}>
                  Публичный гараж
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDetailModal>
    </div>
  )
}

function PanelCars() {
  const token = getAdminApiToken()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalId, setModalId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')
  const [detail, setDetail] = useState(null)

  const reload = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const res = await getApi().adminRegistryCars(getAdminApiToken())
    setItems(res && typeof res === 'object' && Array.isArray(res.items) ? res.items : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasAdminApiToken()) {
      setLoading(false)
      setItems([])
      return undefined
    }
    setLoading(true)
    setErr('')
    ;(async () => {
      try {
        await reload()
      } catch (e) {
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить автомобили.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, reload])

  const openCar = (id) => {
    setModalId(String(id))
    setModalOpen(true)
    setDetail(null)
    setDetailErr('')
    setDetailLoading(true)
    void (async () => {
      try {
        const d = await getApi().adminRegistryCar(getAdminApiToken(), id)
        setDetail(d && typeof d === 'object' ? d : null)
      } catch (e) {
        setDetailErr(formatHttpErrorMessage(e, 'Не удалось загрузить карточку автомобиля.'))
      } finally {
        setDetailLoading(false)
      }
    })()
  }

  if (!hasAdminApiToken()) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Автомобили
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Реестр машин и карточка просмотра доступны после входа с <code className="adminMono">ADMIN_SUPPORT_*</code>.
        </p>
      </Card>
    )
  }

  const c = detail?.car
  const st = detail?.stats || {}

  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Все автомобили в базе (детейлинг и привязка к владельцу). «Просмотр» — данные по машине и счётчики истории и документов. Редактирование из админки не подключено.
        </p>
      </Card>
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Автомобили
          </h2>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setErr('')
                setLoading(true)
                try {
                  await reload()
                } catch (e) {
                  setErr(formatHttpErrorMessage(e, 'Не удалось обновить.'))
                } finally {
                  setLoading(false)
                }
              })()
            }
          >
            Обновить
          </button>
        </div>
        {err ? (
          <p className="adminSupportErr small" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? <p className="muted small">Загрузка…</p> : null}
        {!loading && items.length === 0 ? <p className="muted small">Пока нет записей.</p> : null}
        {!loading && items.length > 0 ? (
          <div className="adminPreview__tableWrap">
            <table className="adminPreview__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>VIN</th>
                  <th>Номер</th>
                  <th>Владелец</th>
                  <th>Партнёр</th>
                  <th>События</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code className="adminMono">{row.id}</code>
                    </td>
                    <td style={{ maxWidth: 140, wordBreak: 'break-all' }}>{row.vin || '—'}</td>
                    <td>{row.plate || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{row.ownerEmail || '—'}</div>
                      <div className="muted small">{row.ownerName || ''}</div>
                    </td>
                    <td className="muted small">{row.detailingName || '—'}</td>
                    <td>{row.eventsCount ?? 0}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn" data-variant="outline" onClick={() => openCar(row.id)}>
                        Просмотр
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
      <AdminDetailModal
        open={modalOpen}
        title={c ? `Авто #${c.id}` : `Автомобиль #${modalId}`}
        loading={detailLoading}
        err={detailErr}
        onClose={() => {
          setModalOpen(false)
          setDetail(null)
        }}
      >
        {c ? (
          <div className="adminDetailBody">
            <p style={{ margin: '0 0 8px' }}>
              <strong>
                {c.make} {c.model}
              </strong>
              {c.year ? <span className="muted"> · {c.year}</span> : null}
            </p>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              VIN: <code className="adminMono">{c.vin || '—'}</code> · Госномер: {c.plate || '—'} {c.plateRegion || ''} ·
              Город: {c.city || '—'}
            </p>
            <ul className="muted small adminDetailStatList">
              <li>События в истории: {st.eventsCount ?? 0}</li>
              <li>Документов: {st.docsCount ?? 0}</li>
            </ul>
            {detail?.owner ? (
              <p className="muted small" style={{ marginTop: 12 }}>
                Владелец: {detail.owner.email}
                {detail.owner.name ? ` (${detail.owner.name})` : ''}
              </p>
            ) : null}
            {detail?.detailing ? (
              <p className="muted small">
                Партнёр: {detail.detailing.name} · {detail.detailing.city || '—'}
              </p>
            ) : null}
          </div>
        ) : null}
      </AdminDetailModal>
    </div>
  )
}

function PanelPartners({ onPartnersPipelineChanged }) {
  const token = getAdminApiToken()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPartnerId, setModalPartnerId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')
  const [partnerDetail, setPartnerDetail] = useState(null)

  const reload = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const res = await getApi().adminPartnersDirectory(getAdminApiToken())
    const list = res && typeof res === 'object' && Array.isArray(res.items) ? res.items : []
    setItems(list)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasAdminApiToken()) {
      setLoading(false)
      setItems([])
      return undefined
    }
    setLoading(true)
    setErr('')
    ;(async () => {
      try {
        await reload()
      } catch (e) {
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить список партнёров.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, reload])

  const openPartnerSummary = (id) => {
    setModalPartnerId(String(id))
    setModalOpen(true)
    setPartnerDetail(null)
    setDetailErr('')
    setDetailLoading(true)
    void (async () => {
      try {
        const d = await getApi().adminPartnerSummary(getAdminApiToken(), id)
        setPartnerDetail(d && typeof d === 'object' ? d : null)
      } catch (e) {
        setDetailErr(formatHttpErrorMessage(e, 'Не удалось загрузить сводку по партнёру.'))
      } finally {
        setDetailLoading(false)
      }
    })()
  }

  if (!hasAdminApiToken()) {
    return (
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Партнёры и заявки
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Раздел доступен после входа с учётными данными из <code className="adminMono">ADMIN_SUPPORT_LOGIN</code> /{' '}
          <code className="adminMono">ADMIN_SUPPORT_PASSWORD</code> — тогда сохраняется токен API и список подтягивается из
          базы. Сверху — новые заявки на подтверждение, ниже — уже подтверждённые партнёры.
        </p>
      </Card>
    )
  }

  const pending = items.filter((row) => row.kind === 'registration_pending')
  const approved = items.filter((row) => row.kind === 'partner')

  const pendingTable = (
    <div className="adminPreview__tableWrap" style={{ marginTop: 12 }}>
      <table className="adminPreview__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Контакт</th>
            <th>Город</th>
            <th>Дата</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {pending.map((row) => (
            <tr key={`p-${row.id}`}>
              <td>
                <code className="adminMono">{row.id}</code>
              </td>
              <td>{row.name || '—'}</td>
              <td>
                <div style={{ fontSize: 13 }}>{row.email || '—'}</div>
                <div className="muted small">{[row.contactName, row.phone].filter(Boolean).join(' · ') || '—'}</div>
              </td>
              <td>{row.city || '—'}</td>
              <td className="muted small">{row.createdAt ? new Date(row.createdAt).toLocaleString('ru-RU') : '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button type="button" className="btn" data-variant="outline" onClick={() => openPartnerSummary(row.id)}>
                  Статистика
                </button>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  className="btn"
                  data-variant="primary"
                  disabled={busyId === row.id}
                  onClick={() =>
                    void (async () => {
                      setBusyId(row.id)
                      setErr('')
                      setOkMsg('')
                      try {
                        await getApi().adminPartnerRegistrationApprove(getAdminApiToken(), row.id)
                        setOkMsg(`Партнёр #${row.id} подтверждён. На ${row.email} отправлено письмо с паролем для входа.`)
                        await reload()
                        onPartnersPipelineChanged?.()
                      } catch (e) {
                        setErr(formatHttpErrorMessage(e, 'Не удалось подтвердить заявку.'))
                      } finally {
                        setBusyId(null)
                      }
                    })()
                  }
                >
                  {busyId === row.id ? '…' : 'Подтвердить'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Партнёры и заявки
        </h2>
        <p className="muted small" style={{ lineHeight: 1.55 }}>
          <strong>Заявки</strong> (сверху списка) — новые регистрации без подтверждения; после «Подтвердить» на почту уходит письмо с паролем.
          <strong> Подтверждённые</strong> — рабочие аккаунты; «Статистика» — машины, визиты, заявки на привязку, тикеты поддержки. Публичная страница — как у клиента.
        </p>
      </Card>
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Список
          </h2>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setErr('')
                setOkMsg('')
                setLoading(true)
                try {
                  await reload()
                } catch (e) {
                  setErr(formatHttpErrorMessage(e, 'Не удалось обновить.'))
                } finally {
                  setLoading(false)
                }
              })()
            }
          >
            Обновить
          </button>
        </div>
        {err ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
            {err}
          </p>
        ) : null}
        {okMsg ? (
          <p className="muted small" style={{ marginBottom: 12 }}>
            {okMsg}
          </p>
        ) : null}
        {loading ? <p className="muted small">Загрузка…</p> : null}

        {!loading ? (
          <>
            <p className="adminPreview__panelTitle" style={{ fontSize: 15, margin: '16px 0 8px', fontWeight: 700 }}>
              Заявки на проверке
              {pending.length ? (
                <Pill tone="accent" className="adminPreview__inlinePill">
                  {pending.length}
                </Pill>
              ) : null}
            </p>
            {pending.length === 0 ? (
              <p className="muted small" style={{ marginTop: 0 }}>
                Нет заявок на проверке.
              </p>
            ) : (
              pendingTable
            )}

            <p className="adminPreview__panelTitle" style={{ fontSize: 15, margin: '24px 0 8px', fontWeight: 700 }}>
              Подтверждённые партнёры
            </p>
            {approved.length === 0 ? (
              <p className="muted small">Пока нет подтверждённых аккаунтов.</p>
            ) : (
              <ul className="adminPreview__partnerList">
                {approved.map((p) => (
                  <li key={`a-${p.id}`} className="adminPreview__partnerRow">
                    <div>
                      <div className="adminPreview__partnerName">{p.name || '—'}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.city || '—'} · авто в базе: {p.carsCount ?? 0} · <code className="adminMono">{p.id}</code>
                      </div>
                    </div>
                    <div className="row gap wrap" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn" data-variant="outline" onClick={() => openPartnerSummary(p.id)}>
                        Статистика
                      </button>
                      <Link className="btn" data-variant="ghost" to={publicDetailingPath({ id: p.id, publicSlug: p.publicSlug })}>
                        Публичная страница
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </Card>
      <AdminDetailModal
        open={modalOpen}
        title={`Партнёр #${modalPartnerId}`}
        loading={detailLoading}
        err={detailErr}
        onClose={() => {
          setModalOpen(false)
          setPartnerDetail(null)
        }}
      >
        {partnerDetail?.profile ? (
          <div className="adminDetailBody">
            <p style={{ margin: '0 0 8px' }}>
              <strong>{partnerDetail.profile.name}</strong>
              <span className="muted"> · {partnerDetail.profile.email}</span>
            </p>
            {partnerDetail.isPendingVerification ? (
              <Pill tone="accent">Заявка на проверке</Pill>
            ) : (
              <Pill>подтверждён</Pill>
            )}
            <ul className="muted small adminDetailStatList" style={{ marginTop: 12 }}>
              <li>Автомобилей в базе: {partnerDetail.stats?.carsTotal ?? 0}</li>
              <li>Событий в истории: {partnerDetail.stats?.carEventsTotal ?? 0}</li>
              <li>Заявок на привязку (ожидают): {partnerDetail.stats?.claimsPending ?? 0}</li>
              <li>Заявок на привязку (всего): {partnerDetail.stats?.claimsTotal ?? 0}</li>
              <li>Обращений в поддержку: {partnerDetail.stats?.supportTicketsTotal ?? 0}</li>
            </ul>
            <div style={{ marginTop: 14 }}>
              <Link
                className="btn"
                data-variant="ghost"
                to={publicDetailingPath({ id: partnerDetail.profile.id, publicSlug: partnerDetail.profile.publicSlug })}
              >
                Публичная страница
              </Link>
            </div>
          </div>
        ) : null}
      </AdminDetailModal>
    </div>
  )
}

export default function AdminPanelPage() {
  const nav = useNavigate()
  const [tab, setTab] = useState('dash')
  const hasApiToken = hasAdminApiToken()
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewErr, setOverviewErr] = useState('')

  const reloadOverview = useCallback(async () => {
    if (!hasAdminApiToken()) {
      setOverview(null)
      setOverviewErr('')
      setOverviewLoading(false)
      return
    }
    setOverviewLoading(true)
    setOverviewErr('')
    try {
      const data = await getApi().adminDashboardOverview(getAdminApiToken())
      setOverview(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setOverviewErr(formatHttpErrorMessage(e, 'Не удалось загрузить статистику.'))
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasApiToken) {
      setOverview(null)
      setOverviewErr('')
      setOverviewLoading(false)
      return undefined
    }
    void reloadOverview()
    return undefined
  }, [hasApiToken, reloadOverview])

  const logout = () => {
    clearAdminMockSession()
    clearAdminApiToken()
    nav('/admin/379team', { replace: true })
  }

  let body = null
  if (tab === 'dash') {
    body = (
      <PanelDash
        hasApiToken={hasApiToken}
        overview={overview}
        overviewLoading={overviewLoading}
        overviewErr={overviewErr}
        onRetry={() => void reloadOverview()}
      />
    )
  } else if (tab === 'support') body = <PanelSupport onTicketPipelineChanged={reloadOverview} />
  else if (tab === 'partners') body = <PanelPartners onPartnersPipelineChanged={reloadOverview} />
  else if (tab === 'users') body = <PanelUsers />
  else if (tab === 'cars') body = <PanelCars />
  else if (tab === 'push') body = <PanelPush />
  else {
    body = (
      <Card className="card pad">
        <p className="muted small">Выберите раздел в меню слева.</p>
      </Card>
    )
  }

  return (
    <div className="container adminPreviewPage">
      <Seo
        title="Админ-панель (макет) · КарПас"
        description="Панель управления: статистика, поддержка, партнёры и заявки, пользователи, автомобили, push."
        noindex
      />
      <div className="adminPreview__layout">
        <aside className="adminPreview__aside card pad" aria-label="Разделы админки">
          <div className="adminPreview__brand muted" style={{ fontSize: 12, marginBottom: 12 }}>
            КарПас · администрирование
          </div>
          <nav className="adminPreview__nav">
            {NAV.map((n) => {
              const count = typeof n.badgeFrom === 'function' ? Number(n.badgeFrom(overview)) || 0 : 0
              const showBadge = count > 0
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`adminPreview__navBtn${tab === n.id ? ' adminPreview__navBtn--active' : ''}`}
                  onClick={() => setTab(n.id)}
                >
                  <span className="adminPreview__navBtnInner">
                    <span>{n.label}</span>
                    {showBadge ? (
                      <span
                        className={`adminPreview__navBadge${
                          n.badgeTone === 'urgent' ? ' adminPreview__navBadge--urgent' : ' adminPreview__navBadge--pending'
                        }`}
                        aria-label={`${count} новых`}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="adminPreview__main">
          <div className="row spread gap wrap" style={{ marginBottom: 16 }}>
            <h1 className="h1 adminPreview__h1">Панель управления сервисом</h1>
            <div className="row gap wrap">
              <Link className="btn" data-variant="ghost" to="/" state={OPEN_SERVICE_ABOUT_STATE}>
                На сайт
              </Link>
              <button type="button" className="btn" data-variant="outline" onClick={logout}>
                Выйти из админки
              </button>
            </div>
          </div>
          {body}
        </div>
      </div>
    </div>
  )
}
