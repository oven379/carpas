import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Button, Card, Field, Input, Textarea } from '../components.jsx'
import { fmtDateTime, fmtKm } from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'

const DETAILING_SERVICES = [
  {
    group: 'Мойка / уход',
    items: [
      'Мойка кузова',
      'Деликатная мойка (2‑фазная)',
      'Антибитум',
      'Удаление следов насекомых',
      'Чистка дисков',
      'Чернение резины',
      'Химчистка ковриков',
    ],
  },
  {
    group: 'Салон',
    items: ['Пылесос салона', 'Химчистка салона', 'Озонация', 'Уход за кожей', 'Уход за пластиком'],
  },
  {
    group: 'Кузов',
    items: [
      'Осмотр ЛКП',
      'Полировка (1‑шаг)',
      'Полировка (2‑шаг)',
      'Полировка (3‑шаг)',
      'Керамика',
      'Воск/синтетика',
      'Антидождь',
      'Удаление царапин локально',
    ],
  },
  {
    group: 'Защита',
    items: [
      'Оклейка пленкой (PPF)',
      'Оклейка зон риска (PPF)',
      'Тонировка',
      'Бронирование фар',
    ],
  },
  {
    group: 'Стёкла / оптика',
    items: ['Полировка фар', 'Полировка стекол', 'Чистка стекол', 'Антизапотевание'],
  },
]

const WASH_SERVICE_MARKERS = new Set(DETAILING_SERVICES.find((g) => g.group === 'Мойка / уход')?.items || [])

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

export default function HistoryPage() {
  const { id } = useParams()
  const r = useRepo()
  const { detailingId, owner, mode } = useDetailing()
  const scope = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = r.getCar(id, scope)
  if (!car) return <Navigate to="/cars" replace />
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const fromRaw = sp.get('from') || ''
  const from = fromRaw ? decodeURIComponent(fromRaw) : ''

  const events = r.listEvents(id, scope)
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
    type: 'visit',
  })
  const [files, setFiles] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const formRef = useRef(null)

  const [svcOpen, setSvcOpen] = useState(false)
  const [svcQ, setSvcQ] = useState('')
  const svcRef = useRef(null)

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
        setDraft({ title: '', mileageKm: '', note: '', services: [], type: 'visit' })
        setFiles([])
        setSvcOpen(false)
        setSvcQ('')
      }
    }
  }, [sp])

  useEffect(() => {
    if (!svcOpen) return
    const onDown = (ev) => {
      if (!svcRef.current) return
      if (svcRef.current.contains(ev.target)) return
      setSvcOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [svcOpen])

  useEffect(() => {
    if (!showNew) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showNew])

  const title = useMemo(() => `${car.make} ${car.model}`, [car])

  const visibleEvents = mode === 'owner' ? (tab === 'owner' ? ownerEvents : serviceEvents) : events

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
            setDraft({ title: '', mileageKm: '', note: '', services: [], type: 'visit' })
            setFiles([])
            setSvcOpen(false)
            setSvcQ('')
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
                {Array.isArray(e.services) && e.services.length ? (
                  <div className="rowItem__sub">Работы: {e.services.join(', ')}</div>
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
                        type: e.type || 'visit',
                      })
                      setFiles([])
                      setSvcOpen(false)
                      setSvcQ('')
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
                          type: e.type || 'visit',
                        })
                        setFiles([])
                        setSvcOpen(false)
                        setSvcQ('')
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
            <Field label="Описание">
              <Textarea
                className="textarea"
                rows={3}
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="Что сделали, где, сколько стоило, гарантия…"
              />
            </Field>
            <Field label="Услуги детейлинга" hint="выбор из выпадающего списка">
              <div className="svcdd" ref={svcRef}>
                <button
                  type="button"
                  className="input svcdd__btn"
                  onClick={() => {
                    setSvcOpen((v) => !v)
                    if (!svcOpen) setTimeout(() => svcRef.current?.querySelector('input')?.focus?.(), 0)
                  }}
                >
                  <span>Выбрать услуги</span>
                  <span className="svcdd__meta">
                    {Array.isArray(draft.services) && draft.services.length ? `(${draft.services.length})` : '(0)'}
                  </span>
                </button>

                {svcOpen ? (
                  <div className="svcdd__menu" role="dialog" aria-label="Выбор услуг">
                    <div className="svcdd__top">
                      <input
                        className="input svcdd__search"
                        placeholder="Поиск услуги…"
                        value={svcQ}
                        onChange={(e) => setSvcQ(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn"
                        data-variant="ghost"
                        onClick={() => {
                          setDraft((d) => ({ ...d, services: [] }))
                          setSvcQ('')
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
                          setSvcOpen(false)
                          setSvcQ('')
                        }}
                      >
                        Готово
                      </button>
                    </div>

                    <div className="svcdd__list">
                      {DETAILING_SERVICES.map((g) => {
                        const q = String(svcQ || '').trim().toLowerCase()
                        const items = q ? g.items.filter((x) => String(x).toLowerCase().includes(q)) : g.items
                        if (!items.length) return null
                        return (
                          <details key={g.group} className="svcdd__group" open>
                            <summary className="svcdd__title">
                              <span>{g.group}</span>
                              <span className="svcdd__count">
                                {countSelected(draft.services, g.items)}/{g.items.length}
                              </span>
                            </summary>
                            <div className="svcdd__grid">
                              {items.map((it) => {
                                const checked = Array.isArray(draft.services) && draft.services.includes(it)
                                return (
                                  <button
                                    type="button"
                                    key={it}
                                    className={`svcdd__item ${checked ? 'is-on' : ''}`}
                                    onClick={() => {
                                      setDraft((d) => ({ ...d, services: toggle(d.services, it) }))
                                      setSvcOpen(false)
                                      setSvcQ('')
                                    }}
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
                        const q = String(svcQ || '').trim()
                        const hasAny = DETAILING_SERVICES.some((g) =>
                          (q ? g.items.filter((x) => String(x).toLowerCase().includes(q.toLowerCase())) : g.items).length,
                        )
                        if (hasAny) return null
                        return <div className="muted small">Ничего не найдено.</div>
                      })()}
                    </div>
                  </div>
                ) : null}

                {Array.isArray(draft.services) && draft.services.length ? (
                  <div className="svcdd__chips">
                    {draft.services.slice(0, 12).map((s) => (
                      <button
                        type="button"
                        key={s}
                        className="svcdd__chip"
                        onClick={() => setDraft((d) => ({ ...d, services: toggle(d.services, s) }))}
                        title="Убрать"
                      >
                        {s} <span aria-hidden>×</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Field>
            <Field label="Фото (по визиту)" hint="можно выбрать несколько файлов">
              <input
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length ? (
                <div className="muted small" style={{ marginTop: 6 }}>
                  Выбрано: {files.length}
                </div>
              ) : null}
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

                  setDraft({ title: '', mileageKm: '', note: '', services: [], type: 'visit' })
                  setFiles([])
                  invalidateRepo()
                  setShowNew(false)
                  setEditingId(null)
                  setSvcOpen(false)
                  setSvcQ('')
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
              {editingId ? 'Сохранить' : 'Добавить'}
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

