import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useRepo } from '../useRepo.js'
import { BackNav, Card, Input, PageLoadSpinner, Pill, ServiceHint } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import {
  comparablePhoneDigitsRu,
  displayRuPhone,
  fmtDate,
  fmtKm,
  fmtPlateFull,
  normVin,
} from '../../lib/format.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { resolvePublicMediaUrl } from '../../lib/mediaUrl.js'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import DefaultAvatar from '../DefaultAvatar.jsx'
import { PhotoLightbox } from '../PhotoLightbox.jsx'

const STALE_VISIT_DAYS = 15
const TASK_DUE_DAYS = 2

function carTitle(row) {
  const c = row?.car || {}
  return [c.make, c.model].filter(Boolean).join(' ').trim() || 'Автомобиль'
}

function clientName(row) {
  return String(row?.client?.name || row?.client?.email || row?.client?.phone || 'Клиент').trim()
}

function rowSearchText(row) {
  const c = row?.car || {}
  const cl = row?.client || {}
  return [
    cl.name,
    cl.phone,
    cl.email,
    c.make,
    c.model,
    c.vin,
    c.plate,
    c.plateRegion,
    fmtPlateFull(c.plate, c.plateRegion),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function matchesQuery(row, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const text = rowSearchText(row)
  if (text.includes(q)) return true
  const phone = comparablePhoneDigitsRu(q)
  if (phone.length >= 3) {
    const cl = row?.client || {}
    const c = row?.car || {}
    const hay = [cl.phone, c.clientPhone, c.ownerPhone, c.ownerAccountPhone].map(comparablePhoneDigitsRu)
    if (hay.some((x) => x.includes(phone))) return true
  }
  const vin = normVin(q)
  if (vin && normVin(row?.car?.vin).includes(vin)) return true
  return false
}

function lastVisitTime(row) {
  const t = Date.parse(row?.lastVisit?.at || '')
  return Number.isFinite(t) ? t : 0
}

function rowUpdatedTime(row) {
  const t = Date.parse(row?.updatedAt || '')
  return Number.isFinite(t) ? t : 0
}

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function isLastVisitToday(row) {
  const t = lastVisitTime(row)
  if (!t) return false
  const dayStart = startOfLocalDay()
  return t >= dayStart && t < dayStart + 24 * 60 * 60 * 1000
}

function isLastVisitStale(row) {
  const t = lastVisitTime(row)
  if (!t) return false
  return t < startOfLocalDay() - STALE_VISIT_DAYS * 24 * 60 * 60 * 1000
}

function hasOpenBookingRequest(row) {
  return Number(row?.bookingRequestsCount || 0) > 0
}

function isNextContactDueSoon(row) {
  const days = Number(row?.nextReminder?.daysLeft)
  return Number.isFinite(days) && days <= TASK_DUE_DAYS
}

function hasCrmTask(row) {
  return hasOpenBookingRequest(row) || isNextContactDueSoon(row)
}

function taskPriority(row) {
  if (hasOpenBookingRequest(row)) return 0
  if (isNextContactDueSoon(row)) return 1
  return 2
}

function sortTasksFirst(a, b) {
  return taskPriority(a) - taskPriority(b) || lastVisitTime(b) - lastVisitTime(a) || rowUpdatedTime(b) - rowUpdatedTime(a)
}

function sortByLastVisitDesc(a, b) {
  return lastVisitTime(b) - lastVisitTime(a) || rowUpdatedTime(b) - rowUpdatedTime(a)
}

function matchesFilter(row, filter) {
  if (filter === 'tasks') return hasCrmTask(row)
  if (filter === 'today') return isLastVisitToday(row)
  if (filter === 'stale') return isLastVisitStale(row)
  return true
}

function ClientAvatar({ row }) {
  const c = row?.car || {}
  const cl = row?.client || {}
  const avatar = c.ownerGarageAvatar ? resolvePublicMediaUrl(c.ownerGarageAvatar) : ''
  if (avatar) return <img src={avatar} alt="" />
  return <DefaultAvatar email={cl.email || c.clientEmail || ''} fallback={clientName(row)} alt="" />
}

function LastVisitPhotoStrip({ photos, onOpen }) {
  const galleryItems = docsToPhotoItems(photos)
  if (!galleryItems.length) return null
  const visible = galleryItems.slice(0, 2)
  const extra = Math.max(0, galleryItems.length - visible.length)

  return (
    <div className="detCrmVisitPhotos" aria-label="Фото последнего визита">
      {visible.map((photo, idx) => (
        <button
          key={photo.id || `${photo.url}-${idx}`}
          type="button"
          className="detCrmVisitPhotos__item"
          onClick={() => onOpen(idx)}
        >
          <img src={photo.url} alt={photo.title || 'Фото последнего визита'} />
          {idx === visible.length - 1 && extra > 0 ? (
            <span className="detCrmVisitPhotos__more">+{extra}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export default function DetailingClientsPage() {
  const r = useRepo()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const { detailingId, mode, loading } = useDetailing()
  const [data, setData] = useState({ items: [], stats: {} })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [pushBusy, setPushBusy] = useState('')
  const [photoLb, setPhotoLb] = useState(null)
  const query = sp.get('q') || ''
  const filter = sp.get('filter') || 'all'
  const selectedId = sp.get('id') || ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!detailingId || mode !== 'detailing') {
        setData({ items: [], stats: {} })
        setBusy(false)
        return
      }
      setBusy(true)
      setError('')
      try {
        const res = await r.detailingCrmClients()
        if (cancelled) return
        setData({
          items: Array.isArray(res?.items) ? res.items : [],
          stats: res?.stats && typeof res.stats === 'object' ? res.stats : {},
        })
      } catch (e) {
        if (!cancelled) {
          setError(formatHttpErrorMessage(e))
          setData({ items: [], stats: {} })
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [r, r._version, detailingId, mode])

  const rows = useMemo(() => {
    return (data.items || [])
      .filter((row) => matchesFilter(row, filter))
      .filter((row) => matchesQuery(row, query))
      .sort(filter === 'tasks' ? sortTasksFirst : sortByLastVisitDesc)
  }, [data.items, filter, query])
  const selected = useMemo(() => {
    return rows.find((row) => String(row.id) === String(selectedId)) || rows[0] || null
  }, [rows, selectedId])
  const taskCount = useMemo(() => (data.items || []).filter(hasCrmTask).length, [data.items])
  const filters = useMemo(() => [
    { id: 'all', label: 'Все' },
    { id: 'today', label: 'Сегодня' },
    { id: 'tasks', label: 'Запись', count: taskCount },
  ], [taskCount])
  function setFilter(next) {
    const n = new URLSearchParams(sp)
    if (next === 'all') n.delete('filter')
    else n.set('filter', next)
    n.delete('id')
    setSp(n, { replace: true })
  }

  function setQuery(next) {
    const n = new URLSearchParams(sp)
    if (next) n.set('q', next)
    else n.delete('q')
    n.delete('id')
    setSp(n, { replace: true })
  }

  function selectRow(id) {
    const n = new URLSearchParams(sp)
    n.set('id', String(id))
    setSp(n, { replace: true })
  }

  async function sendClientPush(kind) {
    if (!selected) return
    setPushBusy(kind)
    try {
      const res = await r.sendDetailingClientPush(selected.id, { kind })
      alert(res?.message || 'Push отправлен.')
    } catch (e) {
      alert(formatHttpErrorMessage(e))
    } finally {
      setPushBusy('')
    }
  }

  async function closeBookingRequest(requestId) {
    if (!requestId) return
    try {
      await r.updateServiceBookingRequest(requestId, { status: 'closed' })
      const res = await r.detailingCrmClients()
      setData({
        items: Array.isArray(res?.items) ? res.items : [],
        stats: res?.stats && typeof res.stats === 'object' ? res.stats : {},
      })
    } catch (e) {
      alert(formatHttpErrorMessage(e))
    }
  }

  async function closeNextContactTask(row) {
    const eventId = row?.lastVisit?.id
    if (!row?.id || !eventId) return
    try {
      await r.updateEvent(row.id, eventId, { nextContactAt: null })
      const res = await r.detailingCrmClients()
      setData({
        items: Array.isArray(res?.items) ? res.items : [],
        stats: res?.stats && typeof res.stats === 'object' ? res.stats : {},
      })
    } catch (e) {
      alert(formatHttpErrorMessage(e))
    }
  }

  function openLastVisitPhotos(photos, startIndex = 0) {
    const items = docsToPhotoItems(photos).map((x) => ({ url: x.url, title: x.title }))
    if (!items.length) return
    setPhotoLb({ items, startIndex })
  }

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading || busy) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  const stats = data.stats || {}
  const selectedCar = selected?.car || {}
  const selectedClient = selected?.client || {}
  const phone = displayRuPhone(selectedClient.phone)
  const from = `/detailing/clients${sp.toString() ? `?${sp.toString()}` : ''}`

  return (
    <div className="container detCrm">
      <div className="row spread gap detCrm__head">
        <div>
          <div className="breadcrumbs">
            <Link to="/detailing">Кабинет</Link>
            <span> / </span>
            <span>Клиенты</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/detailing" title="Назад" />
            <h1 className="h1" style={{ margin: 0 }}>
              Клиенты и автомобили
            </h1>
            <ServiceHint scopeId="det-crm-head" variant="compact" label="Справка: CRM">
              <p className="serviceHint__panelText">
                CRM собирает клиентов из карточек авто и визитов вашего сервиса. Фильтр «Запись» показывает заявки
                владельцев и клиентов, с которыми пора связаться по дате следующего контакта.
              </p>
            </ServiceHint>
          </div>
        </div>
        <button type="button" className="btn" data-variant="primary" onClick={() => nav('/create?from=/detailing/clients')}>
          + Добавить авто
        </button>
      </div>

      <div className="detCrm__stats" aria-label="Показатели CRM">
        <Card className="card pad detCrmStat"><span>Клиентов</span><strong>{stats.clients ?? 0}</strong></Card>
        <Card className="card pad detCrmStat"><span>Авто</span><strong>{stats.cars ?? 0}</strong></Card>
        <Card className="card pad detCrmStat"><span>Визитов за месяц</span><strong>{stats.visitsThisMonth ?? 0}</strong></Card>
        <Card className="card pad detCrmStat"><span>С историей</span><strong>{stats.withVisits ?? 0}</strong></Card>
      </div>

      <Card className="card pad detCrm__toolbar">
        <Input
          className="input detCrm__search"
          value={query}
          placeholder="Поиск по имени, телефону, VIN или госномеру"
          autoCapitalize="off"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="detCrm__filters">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`detCrmFilter${filter === f.id ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              <span>{f.label}</span>
              {f.count > 0 ? <span className="detCrmFilter__badge">{f.count > 9 ? '9+' : f.count}</span> : null}
            </button>
          ))}
        </div>
      </Card>

      {error ? <Card className="card pad detCrm__error">{error}</Card> : null}

      <div className="detCrm__layout">
        <Card className="card detCrm__listCard">
          <div className="detCrm__listHead">
            <span>Клиент</span>
            <span>Автомобиль</span>
            <span>Последний визит</span>
          </div>
          <div className="detCrm__rows">
            {rows.map((row) => {
              const c = row.car || {}
              const cl = row.client || {}
              const isSelected = selected && String(selected.id) === String(row.id)
              const phoneUi = displayRuPhone(cl.phone)
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`detCrmRow${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectRow(row.id)}
                >
                  <span className="detCrmRow__client">
                    <span className="detCrmRow__avatar"><ClientAvatar row={row} /></span>
                    <span className="detCrmRow__clientText">
                      <strong>{clientName(row)}</strong>
                      <small>{phoneUi.display || cl.email || 'Контакт не указан'}</small>
                    </span>
                  </span>
                  <span className="detCrmRow__car">
                    <strong>{carTitle(row)}</strong>
                    <small>{[c.year ? `${c.year} г` : '', fmtPlateFull(c.plate, c.plateRegion)].filter(Boolean).join(' · ') || c.vin || '—'}</small>
                  </span>
                  <span className="detCrmRow__visit">
                    {hasOpenBookingRequest(row) ? (
                      <span className="detCrmRow__taskBadge">Хочет записаться</span>
                    ) : filter === 'tasks' && isNextContactDueSoon(row) ? (
                      <span className="detCrmRow__taskBadge detCrmRow__taskBadge--soft">Связаться</span>
                    ) : null}
                    {row.lastVisit ? (
                      <>
                        <span className="detCrmRow__visitTitle">{row.lastVisit.title || 'Визит'}</span>
                        <span className="detCrmRow__visitDate">{fmtDate(row.lastVisit.at) || 'Дата не указана'}</span>
                        <small>{row.lastVisit.mileageKm ? fmtKm(row.lastVisit.mileageKm) : 'Пробег не указан'}</small>
                      </>
                    ) : (
                      <>
                        <strong>Нет визитов</strong>
                        <small>{`${row.stats?.visitsCount || 0} визитов`}</small>
                      </>
                    )}
                  </span>
                </button>
              )
            })}
            {!rows.length ? (
              <div className="detCrm__empty muted">Клиентов по этому поиску нет.</div>
            ) : null}
          </div>
        </Card>

        <aside className={`detCrm__side${selected ? '' : ' detCrm__side--empty'}`}>
          {selected ? (
            <Card className="card pad detCrmProfile">
              <div className="detCrmProfile__top">
                <div className="detCrmProfile__avatar"><ClientAvatar row={selected} /></div>
                <div className="detCrmProfile__identity">
                  <h2 className="h2 detCrmProfile__title">{clientName(selected)}</h2>
                  <p className="muted small" style={{ margin: '4px 0 0' }}>
                    {selectedClient.isRegisteredOwner ? 'Владелец с аккаунтом КарПас' : 'Клиент из карточки авто'}
                  </p>
                </div>
                <button
                  type="button"
                  className="detCrmProfile__quickVisit"
                  onClick={() => nav(`/car/${selected.id}/history?new=1&from=${encodeURIComponent(from)}`)}
                >
                  Визит
                </button>
              </div>

              <div className="detCrmProfile__car">
                <div className="detCrmProfile__carTitle">{carTitle(selected)}</div>
                <div className="muted small">
                  {[selectedCar.year ? `${selectedCar.year} г` : '', selectedCar.mileageKm ? fmtKm(selectedCar.mileageKm) : '', fmtPlateFull(selectedCar.plate, selectedCar.plateRegion)].filter(Boolean).join(' · ') || 'Данные авто не заполнены'}
                </div>
                {selectedCar.vin ? <div className="mono muted small" style={{ marginTop: 4 }}>VIN: {selectedCar.vin}</div> : null}
              </div>

              <div className="detCrmProfile__contacts">
                {phone.telHref ? <a href={phone.telHref}>{phone.display}</a> : <span className="muted">Телефон не указан</span>}
                {selectedClient.email ? <a href={`mailto:${selectedClient.email}`}>{selectedClient.email}</a> : null}
              </div>

              {selected.latestBookingRequest ? (
                <div className="detCrmProfile__bookingRequest">
                  <div className="detCrmProfile__bookingRequestTop">
                    <span className="detCrmProfile__bookingRequestBadge">Новая заявка</span>
                    <span className="muted small">{fmtDate(selected.latestBookingRequest.createdAt)}</span>
                  </div>
                  <div className="detCrmProfile__bookingRequestTitle">Клиент хочет записаться</div>
                  <p className="muted small">
                    Хочу записаться на повторный уход, подберите удобное время.
                  </p>
                  <div className="detCrmProfile__bookingRequestActions">
                    {phone.telHref ? (
                      <a className="btn" data-variant="primary" href={phone.telHref}>
                        Позвонить
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      data-variant="ghost"
                      onClick={() => void closeBookingRequest(selected.latestBookingRequest.id)}
                    >
                      Закрыть заявку
                    </button>
                  </div>
                </div>
              ) : isNextContactDueSoon(selected) ? (
                <div className="detCrmProfile__bookingRequest">
                  <div className="detCrmProfile__bookingRequestTop">
                    <span className="detCrmProfile__bookingRequestBadge">Рекомендованное время</span>
                    <span className="muted small">{fmtDate(selected.nextReminder?.at)}</span>
                  </div>
                  <p className="muted small">
                    Подошло рекомендованное время повторного ухода, подберите удобное время.
                  </p>
                  <div className="detCrmProfile__bookingRequestActions">
                    {phone.telHref ? (
                      <a className="btn" data-variant="primary" href={phone.telHref}>
                        Позвонить
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      data-variant="ghost"
                      onClick={() => void closeNextContactTask(selected)}
                    >
                      Закрыть задачу
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="detCrmProfile__actions">
                <button
                  type="button"
                  className="btn"
                  data-variant="outline"
                  onClick={() => nav(`/car/${selected.id}?from=${encodeURIComponent(from)}`)}
                >
                  Открыть историю
                </button>
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  disabled={Boolean(pushBusy)}
                  aria-busy={pushBusy === 'car_ready' || undefined}
                  onClick={() => void sendClientPush('car_ready')}
                >
                  {pushBusy === 'car_ready' ? 'Отправка…' : 'Машина готова'}
                </button>
              </div>

              <div className="detCrmProfile__block">
                <div className="detCrmProfile__blockTitle">Последний визит</div>
                {selected.lastVisit ? (
                  <>
                    <div className="detCrmProfile__lastVisitDate">{fmtDate(selected.lastVisit.at) || 'Дата не указана'}</div>
                    <div>{selected.lastVisit.title || 'Визит'}</div>
                    <div className="muted small">
                      {selected.lastVisit.mileageKm ? fmtKm(selected.lastVisit.mileageKm) : 'Пробег не указан'}
                    </div>
                    {selected.lastVisit.nextContactAt ? (
                      <div className="detCrmProfile__privateLine">
                        <span>Следующий контакт:</span> {fmtDate(selected.lastVisit.nextContactAt)}
                      </div>
                    ) : null}
                    {String(selected.lastVisit.internalNote || '').trim() ? (
                      <div className="detCrmProfile__privateNote">
                        <span>Внутренняя заметка:</span> {selected.lastVisit.internalNote}
                      </div>
                    ) : null}
                    {selected.lastVisit.services?.length ? (
                      <div className="detCrmProfile__chips">
                        {selected.lastVisit.services.slice(0, 4).map((s) => <Pill key={s} tone="neutral">{s}</Pill>)}
                      </div>
                    ) : null}
                    <LastVisitPhotoStrip
                      photos={selected.lastVisit.photos}
                      onOpen={(startIndex) => openLastVisitPhotos(selected.lastVisit.photos, startIndex)}
                    />
                  </>
                ) : (
                  <div className="muted small">Истории визитов пока нет.</div>
                )}
              </div>

            </Card>
          ) : (
            <Card className="card pad muted">Выберите клиента из списка.</Card>
          )}
        </aside>
      </div>
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}
