import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { Button, Card, Field, Input, Pill, Textarea } from '../components.jsx'
import AdminHomeLandingEditor from '../admin/AdminHomeLandingEditor.jsx'
import { clearAdminMockSession } from '../../lib/adminMockSession.js'
import { clearAdminApiToken, getAdminApiToken, hasAdminApiToken } from '../../lib/adminApiSession.js'
import { getApi } from '../../api/index.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { OPEN_SERVICE_ABOUT_STATE } from '../../lib/serviceLandingNav.js'

const NAV = [
  { id: 'dash', label: 'Обзор' },
  { id: 'landing', label: 'Главная' },
  { id: 'users', label: 'Пользователи' },
  { id: 'support', label: 'Поддержка' },
  { id: 'push', label: 'Push' },
  { id: 'cars', label: 'Автомобили' },
  { id: 'partners', label: 'Партнёры' },
  { id: 'partnerApps', label: 'Заявки партнёров' },
  { id: 'mods', label: 'Модерация' },
  { id: 'sys', label: 'Система' },
]

const MOCK_STATS = [
  { k: 'Владельцы', v: '12 480', d: '+3,2% за 7 дн.' },
  { k: 'Активные авто', v: '18 920', d: 'с историей за месяц' },
  { k: 'Партнёры', v: '214', d: '12 на проверке' },
  { k: 'Визиты / мес.', v: '46 200', d: 'по данным аналитики' },
]

/** Серии для мультиграфика: у каждой свой цвет и линия по месяцам (масштаб условный). */
const CHART_MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн']
const CHART_SERIES = [
  { name: 'Визиты (записи в истории)', color: '#9333ea', values: [42, 55, 48, 63, 58, 72] },
  { name: 'Уникальные сессии', color: '#0ea5e9', values: [31, 40, 36, 46, 44, 54] },
  { name: 'Новые владельцы', color: '#22c55e', values: [8, 12, 9, 15, 11, 18] },
  { name: 'Сбои в работе (×10)', color: '#f97316', values: [25, 18, 22, 14, 20, 12] },
]

const MOCK_USERS = [
  { id: 'u-10291', mail: 'ivan***@mail.ru', role: 'Владелец', status: 'Активен', at: '02.04.2026' },
  { id: 'u-10290', mail: 'sto***@yandex.ru', role: 'Партнёр', status: 'Активен', at: '01.04.2026' },
  { id: 'u-10289', mail: 'guest***@gmail.com', role: 'Гость', status: 'Новый', at: '31.03.2026' },
]

const MOCK_CARS = [
  { vin: 'XTA***…***45', plate: 'А 123 ВС 77', owner: 'u-10291', visits: '14', at: '28.03.2026' },
  { vin: 'WVW***…***01', plate: 'К 777 ОО 199', owner: 'u-10288', visits: '3', at: '27.03.2026' },
]

const MOCK_PARTNERS = [
  { id: 'd-881', name: 'Детейлинг «Глянец»', city: 'Москва', tier: 'Pro', claims: '2 ожидают' },
  { id: 'd-442', name: 'СТО «Мотор+»', city: 'Казань', tier: 'Base', claims: '0' },
]

const MOCK_QUEUE = [
  {
    t: 'Заявка партнёра',
    s: 'ИП Иванов — проверка реквизитов',
    who: 'Система / форма заявки',
    badge: 'Новая',
  },
  {
    t: 'Жалоба на визит',
    s: 'Авто XTA… — спор по сумме',
    who: 'Владелец u-10291',
    badge: 'В работе',
  },
  {
    t: 'Новый автомобиль в базе',
    s: 'VIN WVW… — первичное появление',
    who: 'Партнёр «Глянец» (d-881)',
    badge: 'Ожидает',
  },
  {
    t: 'Публичный гараж',
    s: 'Слаг «best-detailing» — смена обложки',
    who: 'Владелец u-10302',
    badge: 'Ожидает',
  },
]

function MultiLineMonthlyChart() {
  const W = 420
  const H = 200
  const padL = 44
  const padR = 12
  const padT = 16
  const padB = 36
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const maxV = Math.max(...CHART_SERIES.flatMap((s) => s.values), 1)
  const n = CHART_MONTHS.length
  const xAt = (i) => padL + (innerW * i) / Math.max(n - 1, 1)
  const yAt = (v) => padT + innerH - (innerH * v) / maxV

  return (
    <div className="adminChart">
      <div className="adminChart__head row spread gap wrap">
        <h2 className="h2 adminPreview__panelTitle">Посещения и активность по месяцам</h2>
        <Pill>мульти-линии</Pill>
      </div>
      <p className="muted small adminChart__explain">
        Несколько показателей на одной сетке: у каждой метрики свой цвет и своя линия. По оси X — месяцы, по Y — условные величины; когда панель подключат к данным сервиса, здесь появятся реальные числа и подписи осей.
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
        {CHART_MONTHS.map((label, i) => (
          <text key={label} x={xAt(i)} y={H - 10} textAnchor="middle" className="adminChart__monthLabel">
            {label}
          </text>
        ))}
        {CHART_SERIES.map((s) => {
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
        {CHART_SERIES.map((s) =>
          s.values.map((v, i) => (
            <circle key={`${s.name}-${i}`} cx={xAt(i)} cy={yAt(v)} r="4" fill={s.color} className="adminChart__dot" />
          )),
        )}
      </svg>
      <ul className="adminChart__legend">
        {CHART_SERIES.map((s) => (
          <li key={s.name}>
            <span className="adminChart__legendSwatch" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PanelDash() {
  return (
    <>
      <div className="adminPreview__kpiGrid">
        {MOCK_STATS.map((x) => (
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
        <MultiLineMonthlyChart />
      </Card>
    </>
  )
}

function PanelTable({ title, cols, rows }) {
  return (
    <Card className="card pad adminPreview__tableCard">
      <div className="row spread gap wrap" style={{ marginBottom: 14 }}>
        <h2 className="h2 adminPreview__panelTitle">{title}</h2>
        <div className="row gap wrap">
          <span className="input adminPreview__fakeSearch" aria-hidden>
            Поиск…
          </span>
          <button type="button" className="btn" data-variant="ghost" disabled>
            Экспорт
          </button>
        </div>
      </div>
      <div className="adminPreview__tableWrap">
        <table className="adminPreview__table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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

function PanelSupport() {
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
  return (
    <div className="adminPreview__stack">
      <PanelTable
        title="Пользователи"
        cols={['ID', 'Контакт', 'Роль', 'Статус', 'Регистрация']}
        rows={MOCK_USERS.map((u) => [u.id, u.mail, u.role, u.status, u.at])}
      />
      <Card className="card pad adminExplainCard">
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Живые обращения в поддержку смотрите в разделе <strong>Поддержка</strong> в боковом меню.
        </p>
      </Card>
    </div>
  )
}

function PanelCars() {
  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Что такое «автомобиль» в админке
        </h2>
        <p className="muted small" style={{ lineHeight: 1.55 }}>
          Это та же карточка машины, что у владельца (VIN, номер, владелец, визиты), плюс <strong>служебное</strong>: публичная ссылка при шаринге карточки, флаги жалобы или спора, внутренний комментарий модератора (видят только админы).
          Типовые действия: просмотр; временно скрыть авто из витрин/поиска; отключить публичный шаринг; оставить заметку «разобрались / на проверке». Ничего из этого не удаляет данные у владельца без отдельной политики — только видимость и модерация.
        </p>
      </Card>
      <PanelTable
        title="Автомобили"
        cols={['VIN', 'Госномер', 'Владелец', 'Визиты', 'Обновлено']}
        rows={MOCK_CARS.map((c) => [c.vin, c.plate, c.owner, c.visits, c.at])}
      />
      <Card className="card pad">
        <div className="row spread gap wrap">
          <h2 className="h2 adminPreview__panelTitle">Карточка авто (макет)</h2>
          <button type="button" className="btn" data-variant="outline" disabled>
            Открыть полную карточку
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          Когда список подключат к базе: клик по строке откроет карточку с вкладками «Данные», «История», «Публичность», «Жалобы», «Заметки».
        </p>
      </Card>
    </div>
  )
}

function PanelPartnerApplications() {
  const token = getAdminApiToken()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [busyId, setBusyId] = useState(null)

  const reload = useCallback(async () => {
    if (!hasAdminApiToken()) return
    const list = await getApi().adminPartnerRegistrationsPending(getAdminApiToken())
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
        if (!cancelled) setErr(formatHttpErrorMessage(e, 'Не удалось загрузить заявки.'))
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
          Заявки партнёров
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.55 }}>
          Раздел доступен после входа с учётными данными из <code className="adminMono">ADMIN_SUPPORT_LOGIN</code> /{' '}
          <code className="adminMono">ADMIN_SUPPORT_PASSWORD</code> — тогда сохраняется токен API и список подтягивается из
          базы.
        </p>
      </Card>
    )
  }

  return (
    <div className="adminPreview__stack">
      <Card className="card pad">
        <div className="row spread gap wrap" style={{ marginBottom: 12 }}>
          <h2 className="h2 adminPreview__panelTitle" style={{ margin: 0 }}>
            Заявки партнёров
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
        <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
          Партнёры, зарегистрировавшиеся по форме и ожидающие подтверждения. После нажатия «Подтвердить» на почту уходит
          благодарность и новый пароль для входа; старый пароль из заявки сбрасывается.
        </p>
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
        {!loading && items.length === 0 ? <p className="muted small">Нет заявок на проверке.</p> : null}
        {!loading && items.length > 0 ? (
          <div className="adminPreview__tableWrap">
            <table className="adminPreview__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Контакт</th>
                  <th>Город</th>
                  <th>Дата</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code className="adminMono">{row.id}</code>
                    </td>
                    <td>{row.name || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{row.email || '—'}</div>
                      <div className="muted small">
                        {[row.contactName, row.phone].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td>{row.city || '—'}</td>
                    <td className="muted small">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString('ru-RU') : '—'}
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
                              setOkMsg(
                                `Партнёр #${row.id} подтверждён. На ${row.email} отправлено письмо с паролем для входа.`,
                              )
                              await reload()
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
        ) : null}
      </Card>
    </div>
  )
}

function PanelPartners() {
  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Доступ к кабинету и лендингу
        </h2>
        <p className="muted small" style={{ lineHeight: 1.55 }}>
          Удобнее всего два пути. <strong>1) Как у клиента</strong> — открыть публичную страницу партнёра по ссылке из списка ниже.
          <strong> 2) Из панели поддержки</strong> — зайти в кабинет детейлинга или в настройки его публичной страницы от имени партнёра, когда такая функция будет доступна, без хранения чужих паролей.
        </p>
      </Card>
      <Card className="card pad">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 14 }}>
          Партнёры и тарифы
        </h2>
        <ul className="adminPreview__partnerList">
          {MOCK_PARTNERS.map((p) => (
            <li key={p.id} className="adminPreview__partnerRow">
              <div>
                <div className="adminPreview__partnerName">{p.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.city} · тариф {p.tier} · <code className="adminMono">{p.id}</code>
                </div>
              </div>
              <div className="row gap wrap" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                <Pill>{p.claims}</Pill>
                <Link className="btn" data-variant="ghost" to="/d/demo-glyanets">
                  Публичная страница
                </Link>
                <button type="button" className="btn" data-variant="outline" disabled title="Скоро: вход в кабинет от имени партнёра">
                  Кабинет
                </button>
                <button type="button" className="btn" data-variant="outline" disabled title="Скоро: настройки публичной страницы от имени партнёра">
                  Настройки лендинга
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function PanelMods() {
  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 10 }}>
          Кто добавил автомобиль
        </h2>
        <p className="muted small" style={{ lineHeight: 1.55 }}>
          В проде на каждую машину сохраняйте <strong>источник создания</strong>: <code className="adminMono">created_by_user_id</code>, роль (владелец / партнёр / система), при партнёре — <code className="adminMono">detailing_id</code>.
          Тогда в модерации и в карточке авто всегда видно: «добавил владелец», «создано из кабинета детейлинга X» или «импорт/миграция». Журнал аудита дополняет спорные случаи.
        </p>
      </Card>
      <Card className="card pad">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 14 }}>
          Очередь модерации
        </h2>
        <ul className="adminPreview__modList">
          {MOCK_QUEUE.map((q) => (
            <li key={q.t + q.s} className="adminPreview__modCard">
              <div className="row spread gap wrap">
                <div>
                  <div className="adminPreview__modTitle">{q.t}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {q.s}
                  </div>
                  <div className="adminModWho muted small" style={{ marginTop: 8 }}>
                    <strong>Кто инициатор / добавил:</strong> {q.who}
                  </div>
                </div>
                <Pill>{q.badge}</Pill>
              </div>
              <div className="row gap" style={{ marginTop: 12 }}>
                <button type="button" className="btn" data-variant="primary" disabled>
                  Открыть сущность
                </button>
                <button type="button" className="btn" data-variant="ghost" disabled>
                  Решение
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function PanelLanding() {
  return <AdminHomeLandingEditor />
}

function PanelSys() {
  return (
    <div className="adminPreview__stack">
      <Card className="card pad adminSuperCard">
        <Pill data-tone="accent">Супер-админ</Pill>
        <p className="adminSuperCard__text">
          Раздел «Система» и опасные кнопки (рассылки, инвалидация, глобальные флаги) — только у роли супер-администратора. Сейчас в макете один администратор; позже разнесём права по ролям и аудиту.
        </p>
      </Card>
      <Card className="card pad">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 14 }}>
          Флаги и лимиты
        </h2>
        <ul className="adminPreview__toggleList">
          <li>
            <span>Регистрация новых партнёров</span>
            <span className="adminPreview__fakeToggle" aria-hidden>
              Вкл
            </span>
          </li>
          <li>
            <span>Публичные страницы гаража</span>
            <span className="adminPreview__fakeToggle adminPreview__fakeToggle--off" aria-hidden>
              Выкл
            </span>
          </li>
          <li>
            <span>Жёсткий лимит фото на визит</span>
            <span className="muted" style={{ fontSize: 12 }}>
              24 шт. (макет)
            </span>
          </li>
        </ul>
      </Card>
      <Card className="card pad">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 14 }}>
          Сервисные действия
        </h2>
        <div className="row gap wrap">
          <button type="button" className="btn" data-variant="ghost" disabled>
            Сброс кэша CDN
          </button>
          <button type="button" className="btn" data-variant="ghost" disabled>
            Рассылка (черновик)
          </button>
          <button type="button" className="btn" data-variant="danger" disabled>
            Только супер-админ
          </button>
        </div>
      </Card>
    </div>
  )
}

export default function AdminPanelPage() {
  const nav = useNavigate()
  const [tab, setTab] = useState('dash')

  const logout = () => {
    clearAdminMockSession()
    clearAdminApiToken()
    nav('/admin/379team', { replace: true })
  }

  let body = null
  if (tab === 'dash') body = <PanelDash />
  else if (tab === 'landing') body = <PanelLanding />
  else if (tab === 'users') body = <PanelUsers />
  else if (tab === 'support') body = <PanelSupport />
  else if (tab === 'push') body = <PanelPush />
  else if (tab === 'cars') body = <PanelCars />
  else if (tab === 'partners') body = <PanelPartners />
  else if (tab === 'partnerApps') body = <PanelPartnerApplications />
  else if (tab === 'mods') body = <PanelMods />
  else body = <PanelSys />

  return (
    <div className="container adminPreviewPage">
      <Seo
        title="Админ-панель (макет) · КарПас"
        description="Панель управления сервисом: обзор, пользователи, тикеты, авто, партнёры, модерация, система."
        noindex
      />
      <div className="adminPreview__layout">
        <aside className="adminPreview__aside card pad" aria-label="Разделы админки">
          <div className="adminPreview__brand muted" style={{ fontSize: 12, marginBottom: 12 }}>
            КарПас · администрирование
          </div>
          <nav className="adminPreview__nav">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`adminPreview__navBtn${tab === n.id ? ' adminPreview__navBtn--active' : ''}`}
                onClick={() => setTab(n.id)}
              >
                {n.label}
              </button>
            ))}
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
