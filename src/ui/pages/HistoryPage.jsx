import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Button, Card, Field, Input, Textarea } from '../components.jsx'
import { fmtDateTime, fmtKm } from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  WASH_SERVICE_MARKERS,
} from '../../lib/serviceCatalogs.js'

function toggle(list, item) {
  const set = new Set(Array.isArray(list) ? list : [])
  if (set.has(item)) set.delete(item)
  else set.add(item)
  return Array.from(set)
}

function countSelected(services, items) {
  const set = new Set(Array.isArray(services) ? services : [])
  let n = 0
  for (const it of items) if (set.has(it)) n++
  return n
}

function ServicePicker({ label, hint, ariaLabel, catalog, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef(null)
  const selected = Array.isArray(value) ? value : []

  useEffect(() => {
    if (!open) return
    const onDown = (ev) => {
      if (rootRef.current?.contains(ev.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <Field label={label} hint={hint}>
      <div className="svcdd" ref={rootRef}>
        <div className="svcdd__anchor">
          <button
            type="button"
            className="input svcdd__btn"
            onClick={() => {
              setOpen((v) => {
                const nextOpen = !v
                if (nextOpen) {
                  setTimeout(
                    () => rootRef.current?.querySelector('.svcdd__search')?.focus?.(),
                    0,
                  )
                }
                return nextOpen
              })
            }}
          >
            <span>Выбрать услуги</span>
            <span className="svcdd__meta">{selected.length ? `(${selected.length})` : '(0)'}</span>
          </button>

          {open ? (
            <div className="svcdd__menu" role="dialog" aria-label={ariaLabel}>
              <div className="svcdd__top">
                <input
                  className="input svcdd__search"
                  placeholder="Поиск услуги…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  onClick={() => {
                    onChange([])
                    setQ('')
                  }}
                >
                  Очистить
                </button>
                <button
                  type="button"
                  className="btn"
                  data-variant="primary"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(false)
                    setQ('')
                  }}
                >
                  Готово
                </button>
              </div>

              <div className="svcdd__list">
                {catalog.map((g) => {
                  const qq = String(q || '').trim().toLowerCase()
                  const items = qq ? g.items.filter((x) => String(x).toLowerCase().includes(qq)) : g.items
                  if (!items.length) return null
                  return (
                    <details key={g.group} className="svcdd__group" open>
                      <summary className="svcdd__title">
                        <span>{g.group}</span>
                        <span className="svcdd__count">
                          {countSelected(selected, g.items)}/{g.items.length}
                        </span>
                      </summary>
                      <div className="svcdd__grid">
                        {items.map((it) => {
                          const checked = selected.includes(it)
                          return (
                            <button
                              type="button"
                              key={it}
                              className={`svcdd__item ${checked ? 'is-on' : ''}`}
                              onClick={() => onChange(toggle(selected, it))}
                            >
                              <span className="svcdd__check">{checked ? '✓' : ''}</span>
                              <span>{it}</span>
                            </button>
                          )
                        })}
                      </div>
                    </details>
                  )
                })}
                {(() => {
                  const qq = String(q || '').trim()
                  const hasAny = catalog.some((g) =>
                    (qq ? g.items.filter((x) => String(x).toLowerCase().includes(qq.toLowerCase())) : g.items).length,
                  )
                  if (hasAny) return null
                  return <div className="muted small">Ничего не найдено.</div>
                })()}
              </div>
            </div>
          ) : null}
        </div>

        {selected.length ? (
          <div className="svcdd__chips">
            {selected.slice(0, 12).map((s) => (
              <button
                type="button"
                key={s}
                className="svcdd__chip"
                onClick={() => onChange(toggle(selected, s))}
                title="Убрать"
              >
                {s} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  )
}

export default function HistoryPage() {
  const { id } = useParams()
  const r = useRepo()
  const { detailingId, owner, mode } = useDetailing()
  const scope = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = r.getCar(id, scope)
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const fromRaw = sp.get('from') || ''
  const from = fromRaw ? decodeURIComponent(fromRaw) : ''

  const events = useMemo(() => {
    if (!car) return []
    const sc = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
    return r.listEvents(id, sc)
  }, [car, id, r, mode, owner?.email, detailingId])
  const serviceEvents = useMemo(() => events.filter((e) => e.source === 'service'), [events])
  const ownerEvents = useMemo(() => events.filter((e) => e.source === 'owner'), [events])
  const [tab, setTab] = useState('service') // service|owner
  useEffect(() => {
    if (mode !== 'owner') return
    const t = sp.get('t')
    if (t === 'owner' || t === 'service') setTab(t)
  }, [sp, mode])

  const [draft, setDraft] = useState({
    title: '',
    mileageKm: '',
    note: '',
    services: [],
    maintenanceServices: [],
    type: 'visit',
  })
  const [files, setFiles] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const formRef = useRef(null)
  const visitPhotosInputId = useId()
  const visitPhotosInputRef = useRef(null)

  const canEdit = (e) => {
    if (!e) return false
    if (e.source !== 'service') return false
    if (mode !== 'detailing') return false
    return true
  }

  useEffect(() => {
    const wantNew = sp.get('new') === '1'
    const edit = sp.get('edit')
    if (wantNew) {
      setShowNew(true)
      // если есть edit=<id> — открываем редактирование, иначе это новая запись
      if (edit) {
        setEditingId(edit)
      } else {
        setEditingId(null)
        setDraft({ title: '', mileageKm: '', note: '', services: [], maintenanceServices: [], type: 'visit' })
        setFiles([])
      }
    }
  }, [sp])

  useEffect(() => {
    if (!showNew) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showNew])

  const title = useMemo(() => (car ? `${car.make} ${car.model}` : ''), [car])

  const visibleEvents = mode === 'owner' ? (tab === 'owner' ? ownerEvents : serviceEvents) : events

  if (!car) return <Navigate to="/cars" replace />

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={`/car/${id}`}>Карточка авто</Link>
            <span> / </span>
            <span>История</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <button className="carBack" type="button" title="Назад" onClick={() => nav(-1)}>
              <span className="chev chev--left" aria-hidden="true" />
              <span className="srOnly">Назад</span>
            </button>
            <h1 className="h1" style={{ margin: 0 }}>
              История — {title}
            </h1>
          </div>
          <p className="muted">События: ТО, ремонты, детейлинг, заметки.</p>
        </div>
      </div>

      <div className="row spread gap" style={{ marginTop: 10 }}>
        <div className="row gap wrap">
          <div className="muted small">История обслуживания автомобиля.</div>
          {mode === 'owner' ? (
            <div className="row gap wrap">
              <button
                className="btn"
                data-variant={tab === 'service' ? 'primary' : 'ghost'}
                onClick={() => {
                  setTab('service')
                  const next = new URLSearchParams(sp)
                  next.set('t', 'service')
                  setSp(next, { replace: true })
                }}
              >
                Подтверждено сервисом ({serviceEvents.length})
              </button>
              <button
                className="btn"
                data-variant={tab === 'owner' ? 'primary' : 'ghost'}
                onClick={() => {
                  setTab('owner')
                  const next = new URLSearchParams(sp)
                  next.set('t', 'owner')
                  setSp(next, { replace: true })
                }}
              >
                Моя история ({ownerEvents.length})
              </button>
            </div>
          ) : null}
        </div>
        <button
          className="btn"
          data-variant="primary"
          onClick={() => {
            setShowNew(true)
            setEditingId(null)
            setDraft({ title: '', mileageKm: '', note: '', services: [], maintenanceServices: [], type: 'visit' })
            setFiles([])
            const next = new URLSearchParams(sp)
            next.set('new', '1')
            next.delete('edit')
            setSp(next, { replace: true })
          }}
        >
          Новая история
        </button>
      </div>

      <div className="list">
        {visibleEvents.map((e) => (
          <Card key={e.id} className="card pad">
            <div className="row spread gap eventRow">
              <div>
                <div className="rowItem__title">{e.title || 'Событие'}</div>
                <div className="rowItem__meta">
                  {fmtDateTime(e.at)} • {fmtKm(e.mileageKm)}
                </div>
                {e.source === 'service' ? (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Подтверждено детейлингом
                  </div>
                ) : null}
                {Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                  <div className="rowItem__sub">ТО: {e.maintenanceServices.join(', ')}</div>
                ) : null}
                {Array.isArray(e.services) && e.services.length ? (
                  <div className="rowItem__sub">Детейлинг: {e.services.join(', ')}</div>
                ) : null}
                {(() => {
                  const photos = r.listDocs(id, scope, { eventId: e.id })
                  if (!photos.length) return null
                  return (
                    <div className="thumbs" style={{ marginTop: 10 }}>
                      {photos.slice(0, 6).map((d) => (
                        <div key={d.id} className="thumbWrap" title={d.title}>
                          <a className="thumb" href={d.url} target="_blank" rel="noreferrer">
                            <img alt={d.title} src={d.url} />
                          </a>
                          {showNew && editingId === e.id ? (
                            <button
                              type="button"
                              className="thumbX"
                              title="Удалить фото"
                              onClick={(ev) => {
                                ev.preventDefault()
                                ev.stopPropagation()
                                if (d.source === 'service' && mode === 'owner') {
                                  alert('Подтверждённые фото детейлинга нельзя удалять из кабинета владельца.')
                                  return
                                }
                                const ok = confirm('Удалить это фото?\n\nВосстановить будет невозможно.')
                                if (!ok) return
                                r.deleteDoc(d.id)
                                invalidateRepo()
                              }}
                            >
                              <span className="thumbX__icon" aria-hidden="true">
                                ×
                              </span>
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {e.note ? <div className="note">{e.note}</div> : null}
              </div>
              <div className="eventActions">
                {e.source === 'service' && canEdit(e) ? (
                  <button
                    className="btn"
                    data-variant="outline"
                    onClick={() => {
                      setEditingId(e.id)
                      setShowNew(true)
                      setDraft({
                        title: e.title || '',
                        mileageKm: e.mileageKm || '',
                        note: e.note || '',
                        services: Array.isArray(e.services) ? e.services : [],
                        maintenanceServices: Array.isArray(e.maintenanceServices) ? e.maintenanceServices : [],
                        type: e.type || 'visit',
                      })
                      setFiles([])
                      const next = new URLSearchParams(sp)
                      next.set('new', '1')
                      next.set('edit', e.id)
                      setSp(next, { replace: true })
                    }}
                  >
                    Редактировать
                  </button>
                ) : null}

                {e.source === 'owner' ? (
                  <div className="row gap wrap eventActions__row">
                    <button
                      className="btn"
                      data-variant="outline"
                      onClick={() => {
                        setEditingId(e.id)
                        setShowNew(true)
                        setDraft({
                          title: e.title || '',
                          mileageKm: e.mileageKm || '',
                          note: e.note || '',
                          services: Array.isArray(e.services) ? e.services : [],
                          maintenanceServices: Array.isArray(e.maintenanceServices) ? e.maintenanceServices : [],
                          type: e.type || 'visit',
                        })
                        setFiles([])
                        const next = new URLSearchParams(sp)
                        next.set('new', '1')
                        next.set('edit', e.id)
                        next.set('t', 'owner')
                        setSp(next, { replace: true })
                      }}
                    >
                      Редактировать
                    </button>
                    <button
                      className="btn"
                      data-variant="danger"
                      onClick={() => {
                        const ok = confirm('Удалить запись истории?\n\nВосстановить её будет невозможно.')
                        if (!ok) return
                        const res = r.deleteEvent(e.id, scope)
                        if (!res) alert('Нельзя удалить это событие.')
                        invalidateRepo()
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
        {visibleEvents.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Событий пока нет.</div>
          </Card>
        ) : null}
      </div>

      {showNew ? (
        <Card className="card pad" style={{ marginTop: 12 }} ref={formRef}>
          <h2 className="h2">{editingId ? 'Редактировать визит (30 минут)' : 'Добавить визит / событие'}</h2>
          <div className="formGrid historyFormGrid">
            <Field label="Заголовок">
              <Input
                className="input"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="ТО-2 / Замена колодок / Заметка…"
              />
            </Field>
            <Field label="Пробег (км)">
              <Input
                className="input"
                inputMode="numeric"
                value={draft.mileageKm}
                onChange={(e) => setDraft((d) => ({ ...d, mileageKm: e.target.value }))}
                placeholder="20000"
              />
            </Field>
            {mode === 'owner' ? (
              <ServicePicker
                label="Услуги ТО"
                hint="Выберите услуги из выпадающего списка"
                ariaLabel="Выбор услуг ТО"
                catalog={MAINTENANCE_SERVICES}
                value={draft.maintenanceServices}
                onChange={(next) => setDraft((d) => ({ ...d, maintenanceServices: next }))}
              />
            ) : null}
            <ServicePicker
              label="Услуги детейлинга"
              hint="Выберите услуги из выпадающего списка"
              ariaLabel="Выбор услуг детейлинга"
              catalog={DETAILING_SERVICES}
              value={draft.services}
              onChange={(next) => setDraft((d) => ({ ...d, services: next }))}
            />
            <Field
              label={
                <span>
                  Добавить <span className="textAccent">фото</span>
                </span>
              }
              hint="можно выбрать несколько файлов"
            >
              <div className="filePick">
                <input
                  id={visitPhotosInputId}
                  className="srOnly"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={visitPhotosInputRef}
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <button
                  type="button"
                  className="btn filePick__btn"
                  data-variant="outline"
                  onClick={() => visitPhotosInputRef.current?.click?.()}
                >
                  Выбрать файлы
                </button>
                <span className="filePick__status" title={files.map((f) => f.name).join(', ')}>
                  {!files.length
                    ? 'Файл не выбран'
                    : files.length === 1
                      ? files[0].name || '1 файл'
                      : `Выбрано файлов: ${files.length}`}
                </span>
              </div>
            </Field>
            <Field label="Добавить комментарий">
              <Textarea
                className="textarea"
                rows={3}
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="Что сделали, где, сколько стоило, гарантия…"
              />
            </Field>
          </div>
          <div className="row gap wrap historyFormActions">
            <Button
              className="btn"
              variant="primary"
              onClick={async () => {
                try {
                  const payload = {
                    title: draft.title,
                    mileageKm: draft.mileageKm,
                    note: draft.note,
                    services: Array.isArray(draft.services) ? draft.services : [],
                    maintenanceServices:
                      mode === 'owner'
                        ? Array.isArray(draft.maintenanceServices)
                          ? draft.maintenanceServices
                          : []
                        : [],
                  }

                  const evt = editingId
                    ? r.updateEvent(editingId, payload, scope)
                    : r.addEvent(scope, id, { type: 'visit', ...payload })

                  if (!evt || !evt.id) {
                    alert(editingId ? 'Не удалось сохранить (нет прав).' : 'Не удалось добавить событие.')
                    return
                  }

                  const hasWash =
                    Array.isArray(draft.services) && draft.services.some((s) => WASH_SERVICE_MARKERS.has(s))

                  if (files.length) {
                    const urls = []
                    for (const f of files) {
                      try {
                        const url = await compressImageFile(f, {
                          maxW: 1600,
                          maxH: 1600,
                          quality: 0.84,
                          maxBytes: 2 * 1024 * 1024,
                        })
                        if (url) urls.push(url)
                        r.addDoc(scope, id, {
                          title: f.name || 'Фото',
                          kind: 'photo',
                          url,
                          eventId: evt.id,
                        })
                      } catch {
                        // ignore single-file read errors in MVP
                      }
                    }
                  }

                  if (hasWash) {
                    // Всегда обновляем блок "последняя мойка" фото этого визита (если они есть).
                    const existing = r.listDocs(id, scope, { eventId: evt.id }).map((d) => d.url).filter(Boolean)
                    if (existing.length) r.updateCar(id, { washPhotos: existing.slice(0, 12) }, scope)
                  }

                  setDraft({ title: '', mileageKm: '', note: '', services: [], maintenanceServices: [], type: 'visit' })
                  setFiles([])
                  invalidateRepo()
                  setShowNew(false)
                  setEditingId(null)
                  const next = new URLSearchParams(sp)
                  next.delete('new')
                  next.delete('edit')
                  setSp(next, { replace: true })
                } catch (err) {
                  const msg = String(err?.message || err || '')
                  if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
                    alert('Не удалось сохранить: переполнено хранилище браузера. Удалите часть фото/событий или сбросьте демо-данные.')
                  } else {
                    alert('Не удалось сохранить историю. Попробуйте ещё раз.')
                  }
                }
              }}
            >
              Сохранить
            </Button>
            {mode === 'detailing' && from ? (
              <button
                className="btn"
                data-variant="outline"
                onClick={async () => {
                  // Сохраняем и возвращаемся в список авто (удобно для потока по нескольким авто)
                  try {
                    const payload = {
                      title: draft.title,
                      mileageKm: draft.mileageKm,
                      note: draft.note,
                      services: Array.isArray(draft.services) ? draft.services : [],
                      maintenanceServices: [],
                    }

                    const evt = editingId
                      ? r.updateEvent(editingId, payload, scope)
                      : r.addEvent(scope, id, { type: 'visit', ...payload })

                    if (!evt || !evt.id) {
                      alert(editingId ? 'Не удалось сохранить (нет прав).' : 'Не удалось добавить событие.')
                      return
                    }

                    const hasWash =
                      Array.isArray(draft.services) && draft.services.some((s) => WASH_SERVICE_MARKERS.has(s))

                    if (files.length) {
                      const urls = []
                      for (const f of files) {
                        try {
                          const url = await compressImageFile(f, {
                            maxW: 1600,
                            maxH: 1600,
                            quality: 0.84,
                            maxBytes: 2 * 1024 * 1024,
                          })
                          if (url) urls.push(url)
                          r.addDoc(scope, id, {
                            title: f.name || 'Фото',
                            kind: 'photo',
                            url,
                            eventId: evt.id,
                          })
                        } catch {
                          // ignore single-file read errors in MVP
                        }
                      }
                    }

                    if (hasWash) {
                      const existing = r.listDocs(id, scope, { eventId: evt.id }).map((d) => d.url).filter(Boolean)
                      if (existing.length) r.updateCar(id, { washPhotos: existing.slice(0, 12) }, scope)
                    }

                    invalidateRepo()
                    nav(from)
                  } catch (err) {
                    const msg = String(err?.message || err || '')
                    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
                      alert(
                        'Не удалось сохранить: переполнено хранилище браузера. Удалите часть фото/событий или сбросьте демо-данные.',
                      )
                    } else {
                      alert('Не удалось сохранить историю. Попробуйте ещё раз.')
                    }
                  }
                }}
              >
                Сохранить и назад
              </button>
            ) : null}
            <button
              className="btn"
              data-variant="ghost"
              onClick={() => {
                setShowNew(false)
                setEditingId(null)
                const next = new URLSearchParams(sp)
                next.delete('new')
                next.delete('edit')
                setSp(next, { replace: true })
              }}
            >
              Отмена
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

