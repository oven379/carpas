import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, Field, Input, Textarea } from '../components.jsx'
import { clampVisitTitle, fmtDateTime, fmtKm, normDigits, VISIT_TITLE_MAX_LEN } from '../../lib/format.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  splitWashDetailingServices,
  WASH_SERVICE_MARKERS,
} from '../../lib/serviceCatalogs.js'
import { buildCarFromQuery } from '../carNav.js'
import { detailingBrandHref } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'

const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000

/** Миниатюра документа визита: при битой ссылке или пустом url — кнопка «Добавить фото». */
function HistoryEventDocThumb({ doc, canReplace, onAddPhoto, openGallery }) {
  const [broken, setBroken] = useState(() => !String(doc?.url || '').trim())
  if (broken) {
    return (
      <div className="thumbWrap">
        {canReplace ? (
          <button
            type="button"
            className="btn historyThumbAdd"
            data-variant="outline"
            onClick={(ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              onAddPhoto()
            }}
          >
            Добавить фото
          </button>
        ) : (
          <span className="muted small historyThumbAdd historyThumbAdd--muted">Фото недоступно</span>
        )}
      </div>
    )
  }
  const img = (
    <img
      alt={doc.title || 'Фото'}
      src={doc.url}
      onError={() => setBroken(true)}
    />
  )
  return (
    <div className="thumbWrap" title={doc.title}>
      {openGallery ? (
        <button
          type="button"
          className="thumb thumb--lb"
          aria-label={doc.title ? `Открыть фото: ${doc.title}` : 'Открыть фото'}
          onClick={(ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            openGallery()
          }}
        >
          {img}
        </button>
      ) : (
        <a className="thumb" href={doc.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
          {img}
        </a>
      )}
    </div>
  )
}

/** Фото визита в форме редактирования: битая ссылка → замена/удаление записи. */
function EditingVisitPhoto({ doc, editAllowed, scope, r, onPickFiles, onDeleted }) {
  const [broken, setBroken] = useState(() => !String(doc?.url || '').trim())
  if (broken) {
    return (
      <div className="thumbWrap">
        <div className="historyEditPhotoBroken">
          {editAllowed ? (
            <>
              <button type="button" className="btn historyThumbAdd" data-variant="outline" onClick={onPickFiles}>
                Добавить фото
              </button>
              <button
                type="button"
                className="btn historyEditPhotoDel"
                data-variant="ghost"
                onClick={(ev) => {
                  ev.preventDefault()
                  const ok = confirm('Удалить эту запись о фото?')
                  if (!ok) return
                  const ok2 = r.deleteDoc(doc.id, scope)
                  if (!ok2) {
                    alert('Не удалось удалить (нет доступа или время редактирования истекло).')
                    return
                  }
                  onDeleted()
                }}
              >
                Удалить запись
              </button>
            </>
          ) : (
            <span className="muted small">Фото недоступно</span>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="thumbWrap" title={doc.title}>
      <a className="thumb" href={doc.url} target="_blank" rel="noreferrer">
        <img alt={doc.title} src={doc.url} onError={() => setBroken(true)} />
      </a>
      {editAllowed ? (
        <button
          type="button"
          className="thumbX"
          title="Удалить фото"
          onClick={(ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            const ok = confirm('Удалить это фото?\n\nВосстановить будет невозможно.')
            if (!ok) return
            const ok2 = r.deleteDoc(doc.id, scope)
            if (!ok2) {
              alert('Не удалось удалить фото (нет доступа или время редактирования истекло).')
              return
            }
            onDeleted()
          }}
        >
          <span className="thumbX__icon" aria-hidden="true">
            ×
          </span>
        </button>
      ) : null}
    </div>
  )
}

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

function ServicePicker({ label, hint, ariaLabel, catalog, value, onChange, disabled = false }) {
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

  useEffect(() => {
    if (disabled && open) setOpen(false)
  }, [disabled, open])

  return (
    <Field label={label} hint={hint}>
      <div className="svcdd" ref={rootRef}>
        <div className="svcdd__anchor">
          <button
            type="button"
            className="input svcdd__btn"
            disabled={disabled}
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
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  disabled={disabled}
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
                  disabled={disabled}
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
                              disabled={disabled}
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
                disabled={disabled}
                onClick={() => {
                  if (disabled) return
                  onChange(toggle(selected, s))
                }}
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
  const { detailingId, detailing, owner, mode } = useDetailing()
  const scope = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = r.getCar(id, scope)
  const baseMileageKm = car ? Number(car.mileageKm) || 0 : 0
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const fromRaw = sp.get('from') || ''
  const from = fromRaw ? decodeURIComponent(fromRaw) : ''
  const wantNew = sp.get('new') === '1'
  const editParam = sp.get('edit')

  const events = useMemo(() => {
    if (!car) return []
    const sc = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
    return r.listEvents(id, sc)
  }, [car, id, r, mode, owner?.email, detailingId])
  const serviceEvents = useMemo(() => events.filter((e) => e.source === 'service'), [events])
  const ownerEvents = useMemo(() => events.filter((e) => e.source === 'owner'), [events])
  const [tab, setTab] = useState('all') // all|service|owner
  useEffect(() => {
    if (mode !== 'owner') return
    const t = sp.get('t')
    if (t === 'all' || t === 'owner' || t === 'service') setTab(t)
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
  const [photoLb, setPhotoLb] = useState(null)
  const formRef = useRef(null)
  const initFormKeyRef = useRef('')
  const visitPhotosInputId = useId()
  const visitPhotosInputRef = useRef(null)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const isWithinEditWindow = useCallback(
    (e) => {
      const base = e?.updatedAt || e?.createdAt || e?.at || null
      const t = base ? new Date(base).getTime() : NaN
      if (!Number.isFinite(t)) return false
      return nowMs - t <= EDIT_WINDOW_MS
    },
    [nowMs],
  )

  const canOpen = useCallback((e) => {
    if (!e) return false
    if (mode === 'detailing') return e.source === 'service'
    if (mode === 'owner') return e.source === 'owner'
    return false
  }, [mode])

  const canEdit = (e) => {
    if (!e) return false
    if (e.source !== 'service') return false
    if (mode !== 'detailing') return false
    return isWithinEditWindow(e)
  }

  const canEditOwner = (e) => {
    if (!e) return false
    if (mode !== 'owner') return false
    if (e.source !== 'owner') return false
    return isWithinEditWindow(e)
  }

  const canEditAny = (e) => canEdit(e) || canEditOwner(e)

  const openVisitEdit = useCallback(
    (e) => {
      if (!canOpen(e)) return
      setEditingId(e.id)
      setShowNew(true)
      setDraft({
        title: clampVisitTitle(e.title || ''),
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
      if (mode === 'owner') next.set('t', 'owner')
      setSp(next, { replace: true })
    },
    [canOpen, sp, setSp, mode],
  )

  useEffect(() => {
    if (!wantNew) {
      initFormKeyRef.current = ''
      return
    }

    const key = `new=1&edit=${editParam || ''}`
    if (initFormKeyRef.current === key) return
    initFormKeyRef.current = key

    if (wantNew) {
      setShowNew(true)
      // если есть edit=<id> — открываем редактирование, иначе это новая запись
      if (editParam) {
        const evt = events.find((x) => x.id === editParam) || null
        if (evt && canOpen(evt)) {
          setEditingId(editParam)
          setDraft({
            title: clampVisitTitle(evt.title || ''),
            mileageKm: evt.mileageKm || '',
            note: evt.note || '',
            services: Array.isArray(evt.services) ? evt.services : [],
            maintenanceServices: Array.isArray(evt.maintenanceServices) ? evt.maintenanceServices : [],
            type: evt.type || 'visit',
          })
          setFiles([])
        } else {
          setShowNew(false)
          setEditingId(null)
          const next = new URLSearchParams(sp)
          next.delete('new')
          next.delete('edit')
          setSp(next, { replace: true })
        }
      } else {
        setEditingId(null)
        setDraft({ title: '', mileageKm: '', note: '', services: [], maintenanceServices: [], type: 'visit' })
        setFiles([])
      }
    }
  }, [wantNew, editParam, events, mode, canOpen, setSp, sp])

  useEffect(() => {
    if (!showNew) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showNew])

  const title = useMemo(() => (car ? `${car.make} ${car.model}` : ''), [car])
  const detForBadge = useMemo(() => {
    const detId = car?.detailingId
    if (!detId || !r.getDetailing) return null
    return r.getDetailing(detId) || null
  }, [car?.detailingId, r])
  const detBadgeLabel = detForBadge?.name ? String(detForBadge.name) : 'Детейлинг'
  const detBadgeInitials = useMemo(() => {
    const nm = String(detForBadge?.name || 'Д').trim()
    return nm.slice(0, 2).toUpperCase()
  }, [detForBadge?.name])

  const visibleEvents =
    mode === 'owner'
      ? tab === 'owner'
        ? ownerEvents
        : tab === 'service'
          ? serviceEvents
          : events
      : events

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
  if (!car) return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />

  const carCardHref = `/car/${id}${buildCarFromQuery(sp.get('from'))}`

  const editingEvent = editingId ? events.find((x) => x.id === editingId) || null : null
  const editAllowed = Boolean(editingEvent && canEditAny(editingEvent))
  const isEditing = Boolean(editingId)
  const formLocked = isEditing && !editAllowed
  const editingPhotos = editingId && editAllowed ? r.listDocs(id, scope, { eventId: editingId }) : []

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={carCardHref}>Карточка авто</Link>
            <span> / </span>
            <span>История</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to={carCardHref} title="К карточке авто" />
            <h1 className="h1" style={{ margin: 0 }}>
              {title}
            </h1>
          </div>
          <p className="muted">События: ТО, ремонты, детейлинг, заметки.</p>
        </div>
      </div>

      <div className="row spread gap" style={{ marginTop: 10 }}>
        <div className="row gap wrap">
          <div className="muted small">История обслуживания автомобиля.</div>
          {mode === 'owner' && serviceEvents.length > 0 && ownerEvents.length > 0 ? (
            <div className="row gap wrap" aria-label="Фильтр истории">
              <button
                className="btn"
                data-variant={tab === 'all' ? 'primary' : 'ghost'}
                onClick={() => {
                  setTab('all')
                  const next = new URLSearchParams(sp)
                  next.set('t', 'all')
                  setSp(next, { replace: true })
                }}
              >
                Все ({events.length})
              </button>
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
          Новый визит
        </button>
      </div>

      <div className="list">
        {visibleEvents.map((e) => {
          const { wash: washList, other: detList } = splitWashDetailingServices(e.services)
          const showDetFooter = mode === 'owner' && e.source === 'service' && detForBadge
          const detBrandTarget = showDetFooter ? detailingBrandHref(detForBadge) : null
          const cardInnerLink = Boolean(showDetFooter && detBrandTarget)
          return (
          <Card
            key={e.id}
            className={`card pad${canOpen(e) ? ' eventCard--clickable' : ''}${showDetFooter ? ' eventCard--detFooter' : ''}`}
            role={canOpen(e) && !cardInnerLink ? 'button' : undefined}
            tabIndex={canOpen(e) ? 0 : undefined}
            onClick={() => openVisitEdit(e)}
            onKeyDown={(ev) => {
              if (!canOpen(e)) return
              if (ev.key !== 'Enter' && ev.key !== ' ') return
              ev.preventDefault()
              ev.stopPropagation()
              openVisitEdit(e)
            }}
            aria-label={canOpen(e) ? 'Открыть визит' : undefined}
            title={canOpen(e) ? (canEditAny(e) ? 'Нажмите, чтобы отредактировать' : 'Нажмите, чтобы посмотреть') : undefined}
          >
            <div className="row spread gap eventRow">
              <div className="eventMain">
                <div className="rowItem__title">{e.title || 'Событие'}</div>
                <div className="rowItem__meta">
                  <span className="eventMeta__when">{fmtDateTime(e.at)}</span>
                  <span className="eventMeta__sep" aria-hidden="true">
                    {' '}
                    ·{' '}
                  </span>
                  <span className="eventMeta__km">{fmtKm(e.mileageKm)}</span>
                </div>
                {e.source === 'service' ? (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Подтверждено детейлингом
                  </div>
                ) : null}
                {Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">ТО:</span> {e.maintenanceServices.join(', ')}
                  </div>
                ) : null}
                {washList.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">Уход:</span> {washList.join(', ')}
                  </div>
                ) : null}
                {detList.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">Детейлинг:</span> {detList.join(', ')}
                  </div>
                ) : null}
                {(() => {
                  const photos = r.listDocs(id, scope, { eventId: e.id })
                  const canPhoto = canEditAny(e)
                  if (!photos.length) {
                    return (
                      <div className="historyCardPhotosEmpty" style={{ marginTop: 10 }}>
                        <div className="muted small">Нет добавленных фотографий.</div>
                        {canPhoto ? (
                          <div className="historyCardAddPhoto" style={{ marginTop: 8 }} onClick={(ev) => ev.stopPropagation()}>
                            <button
                              type="button"
                              className="btn"
                              data-variant="outline"
                              onClick={() => openVisitEdit(e)}
                            >
                              Добавить фото
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  const galleryItems = docsToPhotoItems(photos)
                  return (
                    <div className="thumbs" style={{ marginTop: 10 }}>
                      {photos.slice(0, 6).map((d) => {
                        const gi = galleryItems.findIndex((g) => g.id === d.id)
                        return (
                          <HistoryEventDocThumb
                            key={d.id}
                            doc={d}
                            canReplace={canPhoto}
                            onAddPhoto={() => openVisitEdit(e)}
                            openGallery={
                              gi >= 0
                                ? () =>
                                    setPhotoLb({
                                      items: galleryItems.map((x) => ({ url: x.url, title: x.title })),
                                      startIndex: gi,
                                    })
                                : undefined
                            }
                          />
                        )
                      })}
                    </div>
                  )
                })()}
                {e.note ? <div className="note">{e.note}</div> : null}
              </div>
            </div>
            {showDetFooter ? (
              <div className="eventCardDetBadgeRow">
                {(() => {
                  const detBadgeInner = detForBadge?.logo ? (
                    <img alt="" src={detForBadge.logo} />
                  ) : (
                    <span aria-hidden="true">{detBadgeInitials}</span>
                  )
                  const detBadgeNode =
                    detBrandTarget?.kind === 'external' ? (
                      <a
                        className="detBadge detBadge--btn"
                        href={detBrandTarget.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label={`Сайт сервиса: ${detBadgeLabel}`}
                      >
                        {detBadgeInner}
                      </a>
                    ) : detBrandTarget?.kind === 'app' ? (
                      <Link
                        className="detBadge detBadge--btn"
                        to={detBrandTarget.to}
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label={`Страница сервиса: ${detBadgeLabel}`}
                      >
                        {detBadgeInner}
                      </Link>
                    ) : (
                      <span className="detBadge detBadge--static" title={detBadgeLabel} aria-label={detBadgeLabel}>
                        {detBadgeInner}
                      </span>
                    )
                  return (
                    <>
                      {detBadgeNode}
                      <div className="eventCardDetBadgeRow__text">
                        <div className="eventCardDetBadgeRow__name">{detBadgeLabel}</div>
                        <div className="eventCardDetBadgeRow__visit muted small">Визит: {fmtDateTime(e.at)}</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : null}
          </Card>
          )
        })}
        {visibleEvents.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Событий пока нет.</div>
          </Card>
        ) : null}
      </div>

      {showNew ? (
        <Card className="card pad" style={{ marginTop: 12 }} ref={formRef}>
          <h2 className="h2">{editingId ? 'Редактировать визит' : 'Добавить визит / событие'}</h2>
          {editingId && !editAllowed ? (
            <div className="muted small" style={{ marginTop: 6 }}>
              Редактирование доступно в течение 3 часов с момента последнего сохранения визита.
            </div>
          ) : null}
          <div className="formGrid historyFormGrid">
            <Field
              label="Заголовок"
              hint={`до ${VISIT_TITLE_MAX_LEN} символов, пробелы считаются`}
            >
              <Input
                className="input"
                value={draft.title}
                maxLength={VISIT_TITLE_MAX_LEN}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: clampVisitTitle(e.target.value) }))
                }
                placeholder="ТО-2 / Визит…"
                disabled={formLocked}
              />
            </Field>
            <Field label="Пробег (км)" hint={baseMileageKm ? `мин. ${baseMileageKm} км` : undefined}>
              <Input
                className="input"
                inputMode="numeric"
                value={draft.mileageKm}
                maxLength={7}
                onChange={(e) =>
                  setDraft((d) => {
                    const nextRaw = normDigits(e.target.value, { maxLen: 7 })
                    const n = nextRaw ? Number(nextRaw) : 0
                    if (Number.isFinite(n) && n > 1000000) return d // мягко блокируем ввод сверх лимита
                    return { ...d, mileageKm: nextRaw }
                  })
                }
                placeholder={baseMileageKm ? String(baseMileageKm) : '20000'}
                disabled={formLocked}
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
                disabled={formLocked}
              />
            ) : null}
            <ServicePicker
              label="Детейлинг"
              hint="Можно выбрать несколько услуг из списка"
              ariaLabel="Выбор услуг детейлинга"
              catalog={DETAILING_SERVICES}
              value={draft.services}
              onChange={(next) => setDraft((d) => ({ ...d, services: next }))}
              disabled={formLocked}
            />
            {editingId ? (
              <Field label="Фото визита" hint={editingPhotos.length ? `загружено: ${editingPhotos.length}` : 'пока нет фото'}>
                {editingPhotos.length ? (
                  <div className="thumbs thumbs--big" style={{ marginTop: 6 }}>
                    {editingPhotos.map((d) => (
                      <EditingVisitPhoto
                        key={d.id}
                        doc={d}
                        editAllowed={editAllowed}
                        scope={scope}
                        r={r}
                        onPickFiles={() => visitPhotosInputRef.current?.click?.()}
                        onDeleted={() => invalidateRepo()}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {editAllowed ? (
                      <button
                        type="button"
                        className="btn"
                        data-variant="outline"
                        onClick={() => visitPhotosInputRef.current?.click?.()}
                      >
                        Добавить фото
                      </button>
                    ) : (
                      'Фото визита будут здесь.'
                    )}
                  </div>
                )}
              </Field>
            ) : null}
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
                  disabled={formLocked}
                />
                <button
                  type="button"
                  className="btn filePick__btn"
                  data-variant="outline"
                  onClick={() => visitPhotosInputRef.current?.click?.()}
                  disabled={formLocked}
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
                disabled={formLocked}
              />
            </Field>
          </div>
          <div className="row gap wrap historyFormActions">
            <Button
              className="btn"
              variant="primary"
              disabled={formLocked}
              onClick={async () => {
                try {
                  if (editingId && !editAllowed) {
                    alert('Редактирование визита доступно только в течение 3 часов с момента последнего сохранения.')
                    return
                  }
                  const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                  if (baseMileageKm && nextMileage < baseMileageKm) {
                    alert(`Пробег не может быть меньше текущего (${baseMileageKm} км).`)
                    return
                  }
                  const payload = {
                    title: clampVisitTitle(draft.title),
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
                        // ignore single-file read errors
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
                  if (mode === 'owner') {
                    next.set('t', 'all')
                    setTab('all')
                  }
                  setSp(next, { replace: true })
                } catch (err) {
                  const msg = String(err?.message || err || '')
                  if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
                    alert('Не удалось сохранить: переполнено хранилище браузера. Удалите часть фото/событий или сбросьте локальные данные на экране входа.')
                  } else {
                    alert('Не удалось сохранить историю. Попробуйте ещё раз.')
                  }
                }
              }}
            >
              Сохранить
            </Button>
            {editingId && editingEvent && canEditAny(editingEvent) ? (
              <button
                className="btn"
                data-variant="danger"
                type="button"
                disabled={!editAllowed}
                onClick={() => {
                  if (!editAllowed) {
                    alert('Удаление доступно только в течение 3 часов с момента последнего сохранения визита.')
                    return
                  }
                  const ok = confirm('Удалить запись истории?\n\nВосстановить её будет невозможно.')
                  if (!ok) return
                  const res = r.deleteEvent(editingId, scope)
                  if (!res) {
                    alert('Нельзя удалить это событие.')
                    return
                  }
                  invalidateRepo()
                  setShowNew(false)
                  setEditingId(null)
                  const next = new URLSearchParams(sp)
                  next.delete('new')
                  next.delete('edit')
                  if (mode === 'owner') {
                    next.set('t', 'all')
                    setTab('all')
                  }
                  setSp(next, { replace: true })
                }}
              >
                Удалить
              </button>
            ) : null}
            {mode === 'detailing' && from ? (
              <button
                className="btn"
                data-variant="outline"
                onClick={async () => {
                  // Сохраняем и возвращаемся в список авто (удобно для потока по нескольким авто)
                  try {
                    const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                    if (baseMileageKm && nextMileage < baseMileageKm) {
                      alert(`Пробег не может быть меньше текущего (${baseMileageKm} км).`)
                      return
                    }
                    const payload = {
                      title: clampVisitTitle(draft.title),
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
                          // ignore single-file read errors
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
                        'Не удалось сохранить: переполнено хранилище браузера. Удалите часть фото/событий или сбросьте локальные данные на экране входа.',
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
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}

