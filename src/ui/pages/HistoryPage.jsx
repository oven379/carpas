import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, Field, Input, ServiceHint, Textarea } from '../components.jsx'
import {
  clampVisitTitle,
  clampVisitTitleInput,
  fmtDateTime,
  fmtKm,
  normDigits,
  VISIT_CARE_TIP_MAX_LEN,
  VISIT_TITLE_MAX_LEN,
} from '../../lib/format.js'
import { getSessionOwner } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  dedupeOfferedStrings,
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  splitWashDetailingServices,
  WASH_SERVICE_MARKERS,
} from '../../lib/serviceCatalogs.js'
import { VISIT_MAX_PHOTOS } from '../../lib/uploadLimits.js'
import { buildCarFromQuery } from '../carNav.js'
import {
  FORM_ADD_PHOTOS_HINT,
  FORM_CARE_IMPORTANT_HINT,
  FORM_CARE_TIPS_SECTION_HINT,
  FORM_MILEAGE_HINT,
  FORM_PHOTOS_EDIT_HINT,
  FORM_SERVICES_DET_HINT,
  FORM_SERVICES_TO_HINT,
  FORM_TITLE_HINT,
  HISTORY_PAGE_HINT,
  formMileageHintText,
  formPhotosEditHintText,
  formServicesToHintText,
  formTitleHintText,
  historyPageHintText,
} from '../../lib/historyVisitHints.js'
import { detailingBrandHref } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { isSameCalendarDayAsVisit, visitReadonlyFormNotice } from '../../lib/visitEditCalendar.js'
import { formatHttpErrorMessage } from '../../api/http.js'

const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000

/** Не хватает данных для «завершённого» визита — при «Назад» спрашиваем про черновик. */
function isIncompleteDetailingDraft(draft, baseMileageKm) {
  const title = String(draft.title || '').trim()
  const km = Number(String(draft.mileageKm || '0')) || 0
  const n =
    (Array.isArray(draft.services) ? draft.services.length : 0) +
    (Array.isArray(draft.maintenanceServices) ? draft.maintenanceServices.length : 0)
  if (!title) return true
  if (!km) return true
  if (baseMileageKm && km < baseMileageKm) return true
  if (n < 1) return true
  return false
}

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

/** Превью последнего завершённого визита детейлинга над формой нового визита. */
function DetailingLastVisitPreview({ event, docsForEvent, setPhotoLb }) {
  const e = event
  const { wash: washList, other: detList } = splitWashDetailingServices(e.services)
  const photos = docsForEvent(e.id)
  const galleryItems = docsToPhotoItems(photos)
  return (
    <div className="historyLastVisitPreview">
      <div className="rowItem__title">{e.title || 'Событие'}</div>
      <div className="rowItem__meta">
        <span className="eventMeta__when">{fmtDateTime(e.at)}</span>
        <span className="eventMeta__sep" aria-hidden="true">
          {' '}
          ·{' '}
        </span>
        <span className="eventMeta__km">{fmtKm(e.mileageKm)}</span>
      </div>
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
      {photos.length ? (
        <div className="thumbs" style={{ marginTop: 10 }}>
          {photos.slice(0, 6).map((d) => {
            const gi = galleryItems.findIndex((g) => g.id === d.id)
            return (
              <HistoryEventDocThumb
                key={d.id}
                doc={d}
                canReplace={false}
                onAddPhoto={() => {}}
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
      ) : null}
      {e.note ? <div className="note">{e.note}</div> : null}
    </div>
  )
}

/** Фото визита в форме редактирования: битая ссылка → замена/удаление записи. */
function EditingVisitPhoto({ doc, editAllowed, onPickFiles, onDeleted, onDeleteDoc }) {
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
                onClick={async (ev) => {
                  ev.preventDefault()
                  const ok = confirm('Удалить эту запись о фото?')
                  if (!ok) return
                  try {
                    await onDeleteDoc(doc.id)
                    onDeleted()
                  } catch {
                    alert('Не удалось удалить (нет доступа или время редактирования истекло).')
                  }
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
          onClick={async (ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            const ok = confirm('Удалить это фото?\n\nВосстановить будет невозможно.')
            if (!ok) return
            try {
              await onDeleteDoc(doc.id)
              onDeleted()
            } catch {
              alert('Не удалось удалить фото (нет доступа или время редактирования истекло).')
            }
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

function ServicePicker({
  label,
  hint,
  hintScopeId,
  hintLabel,
  ariaLabel,
  catalog,
  itemsFromProfile = null,
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef(null)
  const selected = Array.isArray(value) ? value : []

  const effectiveCatalog = useMemo(() => {
    if (itemsFromProfile == null) return catalog
    const profile = Array.isArray(itemsFromProfile) ? itemsFromProfile : []
    // Пустой профиль в настройках лендинга — не блокируем визит: показываем полный справочник
    if (!profile.length) return catalog
    const profileSet = new Set(profile.map((s) => String(s).toLowerCase()))
    const orphanSelected = selected.filter((s) => !profileSet.has(String(s).toLowerCase()))
    const items = dedupeOfferedStrings([...profile, ...orphanSelected])
    if (!items.length) return []
    return [{ group: 'Из профиля сервиса', items }]
  }, [itemsFromProfile, catalog, selected])

  const listCatalog = itemsFromProfile != null ? effectiveCatalog : catalog
  const catalogEmpty = !listCatalog.some((g) => (Array.isArray(g.items) ? g.items.length : 0) > 0)

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

  const picker = (
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
                {catalogEmpty ? (
                  <div className="muted small" style={{ padding: '10px 12px', lineHeight: 1.45 }}>
                    В профиле сервиса пока нет услуг в этом разделе. Откройте «Настройки лендинга» и добавьте позиции из
                    справочника или свою строку.
                  </div>
                ) : (
                  <>
                    {listCatalog.map((g) => {
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
                      const hasAny = listCatalog.some((g) =>
                        (qq ? g.items.filter((x) => String(x).toLowerCase().includes(qq.toLowerCase())) : g.items).length,
                      )
                      if (hasAny) return null
                      return <div className="muted small">Ничего не найдено.</div>
                    })()}
                  </>
                )}
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
  )

  if (hintScopeId) {
    return (
      <div className="field field--full serviceHint__fieldWrap" id={hintScopeId}>
        <div className="field__top serviceHint__fieldTop">
          <span className="field__label">{label}</span>
          <ServiceHint scopeId={hintScopeId} label={hintLabel || 'Справка'}>
            {typeof hint === 'string' ? <p className="serviceHint__panelText">{hint}</p> : hint}
          </ServiceHint>
        </div>
        {picker}
      </div>
    )
  }

  return (
    <Field label={label} hint={hint}>
      {picker}
    </Field>
  )
}

const EMPTY_CARE_DRAFT = {
  careImportant: '',
  careTip1: '',
  careTip2: '',
  careTip3: '',
}

function careDraftFromEvent(evt) {
  const ct = evt?.careTips
  if (!ct || typeof ct !== 'object') return { ...EMPTY_CARE_DRAFT }
  const tips = Array.isArray(ct.tips) ? ct.tips : []
  return {
    careImportant: String(ct.important || ''),
    careTip1: String(tips[0] || ''),
    careTip2: String(tips[1] || ''),
    careTip3: String(tips[2] || ''),
  }
}

export default function HistoryPage() {
  const { id } = useParams()
  const r = useRepo()
  const { detailingId, detailing, owner, mode } = useDetailing()
  const ownerEmailResolved = String(owner?.email || getSessionOwner()?.email || '').trim()
  const scope = mode === 'owner' ? { ownerEmail: ownerEmailResolved } : { detailingId }
  const [car, setCar] = useState(null)
  const [events, setEvents] = useState([])
  const [allDocs, setAllDocs] = useState([])
  const [dataReady, setDataReady] = useState(false)
  const baseMileageKm = car ? Number(car.mileageKm) || 0 : 0
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const fromRaw = sp.get('from') || ''
  const from = fromRaw ? decodeURIComponent(fromRaw) : ''
  const wantNew = sp.get('new') === '1'
  const editParam = sp.get('edit')
  const prevHistoryCarIdRef = useRef(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const idChanged = prevHistoryCarIdRef.current !== id
      prevHistoryCarIdRef.current = id
      if (idChanged) setDataReady(false)
      try {
        const [cr, ev, dc] = await Promise.all([r.getCar(id), r.listEvents(id), r.listDocs(id)])
        if (cancelled) return
        setCar(cr)
        setEvents(Array.isArray(ev) ? ev : [])
        setAllDocs(Array.isArray(dc) ? dc : [])
      } catch {
        if (!cancelled) {
          setCar(null)
          setEvents([])
          setAllDocs([])
        }
      } finally {
        if (!cancelled) setDataReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, r, r._version])

  const docsForEvent = useCallback(
    (evId) => {
      if (!evId) return []
      return allDocs.filter((d) => String(d.eventId) === String(evId))
    },
    [allDocs],
  )

  const serviceEvents = useMemo(() => events.filter((e) => e.source === 'service'), [events])
  const ownerEvents = useMemo(() => events.filter((e) => e.source === 'owner'), [events])
  const [tab, setTab] = useState('all') // all|service|owner
  useEffect(() => {
    if (mode !== 'owner') return
    const t = sp.get('t')
    if (t === 'all' || t === 'owner' || t === 'service') setTab(t)
  }, [sp, mode])

  const lastFinalizedDetailingVisit = useMemo(() => {
    if (mode !== 'detailing') return null
    const fin = events.filter((e) => e.source === 'service' && !e.isDraft)
    fin.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    return fin[0] || null
  }, [events, mode])

  const visibleEvents = useMemo(() => {
    if (mode === 'owner') {
      if (tab === 'owner') return ownerEvents
      if (tab === 'service') return serviceEvents
      return events
    }
    return [...events].sort((a, b) => {
      const ad = a.isDraft ? 1 : 0
      const bd = b.isDraft ? 1 : 0
      if (ad !== bd) return bd - ad
      return String(b.at || '').localeCompare(String(a.at || ''))
    })
  }, [mode, tab, ownerEvents, serviceEvents, events])

  useEffect(() => {
    if (mode !== 'detailing' || !wantNew || editParam || !dataReady || !id) return
    let cancelled = false
    ;(async () => {
      try {
        const km = baseMileageKm || 0
        const evt = await r.addEvent(scope, id, {
          type: 'visit',
          isDraft: true,
          title: '',
          mileageKm: km,
          at: new Date().toISOString(),
        })
        if (cancelled || !evt?.id) return
        invalidateRepo()
        setEvents((prev) => {
          const list = Array.isArray(prev) ? [...prev] : []
          if (list.some((x) => String(x.id) === String(evt.id))) return list
          return [evt, ...list]
        })
        setSp((prev) => {
          const next = new URLSearchParams(prev)
          next.set('new', '1')
          next.set('edit', String(evt.id))
          return next
        }, { replace: true })
      } catch (e) {
        if (!cancelled) alert(formatHttpErrorMessage(e, 'Не удалось создать черновик визита.'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, wantNew, editParam, dataReady, id, baseMileageKm, r, scope, setSp, setEvents])

  const [draft, setDraft] = useState({
    title: '',
    mileageKm: '',
    note: '',
    services: [],
    maintenanceServices: [],
    type: 'visit',
    ...EMPTY_CARE_DRAFT,
  })
  const [visitPhotoBusy, setVisitPhotoBusy] = useState(false)
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
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setNowMs(Date.now())
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
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
    if (mode === 'owner') return true
    return false
  }, [mode])

  const canEdit = (e) => {
    if (!e) return false
    if (e.source !== 'service') return false
    if (mode !== 'detailing') return false
    if (e.isDraft) return true
    return isSameCalendarDayAsVisit(e.at, nowMs)
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
        title: clampVisitTitleInput(e.title || ''),
        mileageKm: e.mileageKm || '',
        note: e.note || '',
        services: Array.isArray(e.services) ? e.services : [],
        maintenanceServices: Array.isArray(e.maintenanceServices) ? e.maintenanceServices : [],
        type: e.type || 'visit',
        ...careDraftFromEvent(e),
      })
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
            title: clampVisitTitleInput(evt.title || ''),
            mileageKm: evt.mileageKm || '',
            note: evt.note || '',
            services: Array.isArray(evt.services) ? evt.services : [],
            maintenanceServices: Array.isArray(evt.maintenanceServices) ? evt.maintenanceServices : [],
            type: evt.type || 'visit',
            ...careDraftFromEvent(evt),
          })
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
        setDraft({
          title: '',
          mileageKm: '',
          note: '',
          services: [],
          maintenanceServices: [],
          type: 'visit',
          ...EMPTY_CARE_DRAFT,
        })
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
    if (!detId) return null
    return {
      id: detId,
      name: String(car.detailingName || car.seller?.name || 'Сервис').trim() || 'Сервис',
      logo: null,
      website: car.detailingWebsite || '',
    }
  }, [car])
  const detBadgeLabel = detForBadge?.name ? String(detForBadge.name) : 'Детейлинг'
  const detBadgeInitials = useMemo(() => {
    const nm = String(detForBadge?.name || 'Д').trim()
    return nm.slice(0, 2).toUpperCase()
  }, [detForBadge?.name])

  const visitServiceProfile = useMemo(() => {
    if (mode !== 'detailing' || !detailing) return { det: [], maint: [] }
    return {
      det: Array.isArray(detailing.detailingServicesOffered) ? detailing.detailingServicesOffered : [],
      maint: Array.isArray(detailing.maintenanceServicesOffered) ? detailing.maintenanceServicesOffered : [],
    }
  }, [mode, detailing])

  const editingEvent = editingId ? events.find((x) => x.id === editingId) || null : null
  const editAllowed = Boolean(editingEvent && canEditAny(editingEvent))
  const isEditing = Boolean(editingId)
  const formLocked = isEditing && !editAllowed
  const readonlyFormNotice = editingId && !editAllowed && editingEvent ? visitReadonlyFormNotice(mode, editingEvent) : ''
  const detailingAwaitDraft = mode === 'detailing' && wantNew && !editParam
  const formHeading = !editingId
    ? mode === 'detailing' && wantNew
      ? 'Новый визит'
      : 'Добавить визит / событие'
    : editAllowed
      ? editingEvent?.isDraft
        ? 'Новый визит (черновик)'
        : 'Редактировать визит'
      : editingEvent?.source === 'service' && mode === 'owner'
        ? 'Визит сервиса (просмотр)'
        : 'Просмотр визита'
  const editingPhotos = useMemo(() => {
    if (!editingId || !editAllowed) return []
    return docsForEvent(editingId)
  }, [editingId, editAllowed, docsForEvent])
  const visitPhotosAddBlocked = Boolean(editingId && editAllowed && editingPhotos.length >= VISIT_MAX_PHOTOS)
  const visitPhotosRoom =
    editingId && editAllowed ? Math.max(0, VISIT_MAX_PHOTOS - editingPhotos.length) : VISIT_MAX_PHOTOS

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
  if (!dataReady) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!car) return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />

  const carCardHref = `/car/${id}${buildCarFromQuery(sp.get('from'))}`

  const buildVisitPayload = () => ({
    title: clampVisitTitle(draft.title),
    mileageKm: draft.mileageKm,
    note: draft.note,
    services: Array.isArray(draft.services) ? draft.services : [],
    maintenanceServices: Array.isArray(draft.maintenanceServices) ? draft.maintenanceServices : [],
    ...(mode === 'detailing'
      ? {
          careTips: {
            important: draft.careImportant,
            tips: [draft.careTip1, draft.careTip2, draft.careTip3],
          },
        }
      : {}),
  })

  const closeVisitFormInUrl = () => {
    setShowNew(false)
    setEditingId(null)
    const next = new URLSearchParams(sp)
    next.delete('new')
    next.delete('edit')
    setSp(next, { replace: true })
  }

  const saveDetailingDraftAndGoBack = async () => {
    if (!editingId) return
    if (isIncompleteDetailingDraft(draft, baseMileageKm)) {
      const ok = confirm('Карточка заполнена не полностью. Сохранить как черновик?')
      if (!ok) return
    }
    try {
      await r.updateEvent(id, editingId, { ...buildVisitPayload(), isDraft: true })
      invalidateRepo()
      closeVisitFormInUrl()
      if (from) nav(from)
    } catch (e) {
      alert(formatHttpErrorMessage(e, 'Не удалось сохранить черновик.'))
    }
  }

  const ingestPickedVisitPhotos = async (picked) => {
    if (detailingAwaitDraft || formLocked || visitPhotoBusy || !picked.length) return
    let room = VISIT_MAX_PHOTOS
    if (editingId && editAllowed) {
      room = Math.max(0, VISIT_MAX_PHOTOS - docsForEvent(editingId).length)
    }
    let batch = picked
    if (picked.length > room) {
      if (room === 0) {
        alert(
          `У этого визита уже ${VISIT_MAX_PHOTOS} фото. Удалите лишние на снимках выше, чтобы добавить новые.`,
        )
        return
      }
      alert(
        `Можно прикрепить не более ${VISIT_MAX_PHOTOS} фото к одному визиту. Сейчас доступно ещё ${room}. Добавляем первые ${room}.`,
      )
      batch = picked.slice(0, room)
    }
    setVisitPhotoBusy(true)
    try {
      let eventId = editingId
      if (!eventId) {
        const nextMileage = Number(String(draft.mileageKm || '0')) || 0
        if (baseMileageKm && nextMileage < baseMileageKm) {
          alert(
            `Пробег не может быть меньше текущего (${baseMileageKm} км). Укажите корректный пробег и попробуйте снова.`,
          )
          return
        }
        const evt = await r.addEvent(scope, id, { type: 'visit', ...buildVisitPayload() })
        if (!evt?.id) {
          alert('Не удалось создать визит для фото (нет прав).')
          return
        }
        eventId = evt.id
        initFormKeyRef.current = `new=1&edit=${evt.id}`
        setEditingId(evt.id)
        const next = new URLSearchParams(sp)
        next.set('new', '1')
        next.set('edit', evt.id)
        if (mode === 'owner') next.set('t', 'owner')
        setSp(next, { replace: true })
      } else {
        try {
          await r.updateEvent(id, eventId, buildVisitPayload())
        } catch {
          alert('Не удалось сохранить текст визита перед добавлением фото.')
          return
        }
      }

      const dcFresh = await r.listDocs(id)
      const forEvent = (Array.isArray(dcFresh) ? dcFresh : []).filter(
        (d) => String(d.eventId) === String(eventId),
      )
      const priorPhotoCount = forEvent.length
      const maxNew = Math.max(0, VISIT_MAX_PHOTOS - priorPhotoCount)
      const toAdd = batch.slice(0, maxNew)
      if (batch.length > maxNew && maxNew === 0) {
        alert(
          `У визита уже ${VISIT_MAX_PHOTOS} фото — новые файлы не добавлены. Удалите лишние в списке выше.`,
        )
      } else if (batch.length > maxNew) {
        alert(
          `Добавлено только ${maxNew} из ${batch.length} файлов — на визит не более ${VISIT_MAX_PHOTOS} фото.`,
        )
      }
      for (const f of toAdd) {
        try {
          const url = await compressImageFile(f, {
            maxW: 1600,
            maxH: 1600,
            quality: 0.84,
            maxBytes: 2 * 1024 * 1024,
          })
          if (!url) continue
          await r.addDoc(scope, id, {
            title: f.name || 'Фото',
            kind: 'photo',
            url,
            eventId,
          })
        } catch {
          // ignore single-file read errors
        }
      }

      const hasWash =
        Array.isArray(draft.services) && draft.services.some((s) => WASH_SERVICE_MARKERS.has(s))
      if (hasWash) {
        const freshDocs = await r.listDocs(id)
        const existing = (Array.isArray(freshDocs) ? freshDocs : [])
          .filter((d) => String(d.eventId) === String(eventId))
          .map((d) => d.url)
          .filter(Boolean)
        if (existing.length) await r.updateCar(id, { washPhotos: existing.slice(0, 12) })
      }

      if (typeof r.syncCarWashPhotosFromLatestEvent === 'function') {
        r.syncCarWashPhotosFromLatestEvent(id, scope)
      }
      invalidateRepo()
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
        alert('Не удалось сохранить фото: переполнено хранилище браузера.')
      } else {
        alert('Не удалось добавить фото. Попробуйте ещё раз.')
      }
    } finally {
      setVisitPhotoBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={carCardHref}>Карточка авто</Link>
            <span> / </span>
            <span>История автомобиля</span>
          </div>
          <div id={HISTORY_PAGE_HINT.scopeId} className="serviceHint__pageBlock">
            <div className="serviceHint__pageBlockRow row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to={carCardHref} title="К карточке авто" />
              <h1 className="h1">{title}</h1>
              <ServiceHint scopeId={HISTORY_PAGE_HINT.scopeId} variant="compact" label={HISTORY_PAGE_HINT.label}>
                <p className="serviceHint__panelText">{historyPageHintText(mode)}</p>
              </ServiceHint>
            </div>
          </div>
        </div>
      </div>

      <div className="row spread gap" style={{ marginTop: 10 }}>
        <div className="row gap wrap">
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
        {mode !== 'detailing' ? (
          <button
            className="btn"
            data-variant="primary"
            onClick={() => {
              setShowNew(true)
              setEditingId(null)
              setDraft({
                title: '',
                mileageKm: '',
                note: '',
                services: [],
                maintenanceServices: [],
                type: 'visit',
                ...EMPTY_CARE_DRAFT,
              })
              const next = new URLSearchParams(sp)
              next.set('new', '1')
              next.delete('edit')
              setSp(next, { replace: true })
            }}
          >
            Новый визит
          </button>
        ) : null}
      </div>

      <div className="list">
        {visibleEvents.map((e) => {
          const { wash: washList, other: detList } = splitWashDetailingServices(e.services)
          const showDetFooter = mode === 'owner' && e.source === 'service' && detForBadge
          const showServiceCornerAvatar =
            e.source === 'service' && (mode !== 'owner' || !detForBadge)
          const serviceDetLabel = String(e.detailingName || '').trim() || 'Сервис'
          const serviceDetInitials = serviceDetLabel.slice(0, 2).toUpperCase()
          const detBrandTarget = showDetFooter ? detailingBrandHref(detForBadge) : null
          const cardInnerLink = Boolean(showDetFooter && detBrandTarget)
          const visitReadonlyCard = Boolean(canOpen(e) && !canEditAny(e))
          return (
          <Card
            key={e.id}
            className={`card pad${canOpen(e) ? ' eventCard--clickable' : ''}${visitReadonlyCard ? ' eventCard--visitReadonly' : ''}${e.isDraft ? ' eventCard--draftVisit' : ''}${showDetFooter ? ' eventCard--detFooter' : ''}`}
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
            <div
              className={`row spread gap eventRow${showServiceCornerAvatar ? ' eventRow--withServiceAvatar' : ''}`}
            >
              <div className="eventMain">
                <div className="rowItem__title">{e.title || 'Событие'}</div>
                {mode === 'detailing' && e.isDraft ? (
                  <div className="historyDraftCardBar row gap wrap" onClick={(ev) => ev.stopPropagation()}>
                    <span className="pill" data-tone="accent">
                      Черновик
                    </span>
                    <button
                      type="button"
                      className="btn historyDraftEditBtn"
                      data-variant="outline"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        openVisitEdit(e)
                      }}
                    >
                      <span className="carPage__icon carPage__icon--edit historyDraftEditBtn__icon" aria-hidden="true" />
                      Править
                    </button>
                  </div>
                ) : null}
                <div className="rowItem__meta">
                  <span className="eventMeta__when">{fmtDateTime(e.at)}</span>
                  <span className="eventMeta__sep" aria-hidden="true">
                    {' '}
                    ·{' '}
                  </span>
                  <span className="eventMeta__km">{fmtKm(e.mileageKm)}</span>
                </div>
                {visitReadonlyCard ? (
                  <div className="visitCardReadonlyRow">
                    <span className="pill visitCardReadonlyPill" data-tone="neutral">
                      Только просмотр
                    </span>
                  </div>
                ) : null}
                {e.isDraft && mode === 'detailing' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    Черновик визита · нажмите «Сохранить» в форме, чтобы запись стала частью истории
                  </div>
                ) : e.source === 'service' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    {mode === 'owner' ? (
                      <>Запись сервиса</>
                    ) : visitReadonlyCard ? (
                      <>Подтверждено детейлингом · день визита прошёл</>
                    ) : (
                      <>Подтверждено детейлингом</>
                    )}
                  </div>
                ) : visitReadonlyCard && mode === 'owner' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    Окно редактирования истекло
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
                  const photos = docsForEvent(e.id)
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
              {showServiceCornerAvatar ? (
                <div
                  className="eventCardServiceAvatar"
                  title={serviceDetLabel}
                  aria-label={serviceDetLabel}
                  onClick={(ev) => ev.stopPropagation()}
                  onKeyDown={(ev) => ev.stopPropagation()}
                  role="img"
                >
                  <div className="eventCardServiceAvatar__inner">
                    {e.detailingLogo ? (
                      <img alt="" src={e.detailingLogo} className="eventCardServiceAvatar__img" />
                    ) : (
                      <span className="eventCardServiceAvatar__fallback" aria-hidden="true">
                        {serviceDetInitials}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
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
          {mode === 'detailing' ? (
            <>
              <p className="muted small historyLastVisitPreviewHead">Последний сохранённый визит по этому авто</p>
              {lastFinalizedDetailingVisit ? (
                <DetailingLastVisitPreview
                  event={lastFinalizedDetailingVisit}
                  docsForEvent={docsForEvent}
                  setPhotoLb={setPhotoLb}
                />
              ) : (
                <p className="muted small historyLastVisitPreviewEmpty">
                  Пока нет сохранённых визитов — этот визит станет первой записью в истории.
                </p>
              )}
              <div className="historyFormDivider topBorder" />
            </>
          ) : null}
          {detailingAwaitDraft ? (
            <div className="muted" style={{ padding: '10px 0' }}>
              Создаём черновик визита…
            </div>
          ) : (
            <>
              <h2 className="h2">{formHeading}</h2>
              {readonlyFormNotice ? (
                <div className="visitFormReadonlyNotice muted small" style={{ marginTop: 6 }}>
                  {readonlyFormNotice}
                </div>
              ) : null}
              <div className="formGrid historyFormGrid">
            <div className="field serviceHint__fieldWrap" id={FORM_TITLE_HINT.scopeId}>
              <div className="field__top serviceHint__fieldTop">
                <span className="field__label">Заголовок</span>
                <ServiceHint scopeId={FORM_TITLE_HINT.scopeId} label={FORM_TITLE_HINT.label}>
                  <p className="serviceHint__panelText">{formTitleHintText(VISIT_TITLE_MAX_LEN)}</p>
                </ServiceHint>
              </div>
              <Input
                className="input"
                value={draft.title}
                maxLength={VISIT_TITLE_MAX_LEN}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: clampVisitTitleInput(e.target.value) }))
                }
                placeholder="ТО-2 / Визит…"
                disabled={formLocked}
              />
            </div>
            <div className="field serviceHint__fieldWrap" id={FORM_MILEAGE_HINT.scopeId}>
              <div className="field__top serviceHint__fieldTop">
                <span className="field__label">Пробег (км)</span>
                <ServiceHint scopeId={FORM_MILEAGE_HINT.scopeId} label={FORM_MILEAGE_HINT.label}>
                  <p className="serviceHint__panelText">{formMileageHintText(baseMileageKm)}</p>
                </ServiceHint>
              </div>
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
            </div>
            {mode === 'owner' ? (
              <ServicePicker
                label="Услуги ТО"
                hint={formServicesToHintText(mode)}
                hintScopeId={FORM_SERVICES_TO_HINT.scopeId}
                hintLabel={FORM_SERVICES_TO_HINT.label}
                ariaLabel="Выбор услуг ТО"
                catalog={MAINTENANCE_SERVICES}
                value={draft.maintenanceServices}
                onChange={(next) => setDraft((d) => ({ ...d, maintenanceServices: next }))}
                disabled={formLocked}
              />
            ) : null}
            {mode === 'detailing' ? (
              <>
                <ServicePicker
                  label="Детейлинг"
                  hint={FORM_SERVICES_DET_HINT.textDetailing}
                  hintScopeId={FORM_SERVICES_DET_HINT.scopeId}
                  hintLabel={FORM_SERVICES_DET_HINT.label}
                  ariaLabel="Выбор услуг детейлинга"
                  catalog={DETAILING_SERVICES}
                  itemsFromProfile={visitServiceProfile.det}
                  value={draft.services}
                  onChange={(next) => setDraft((d) => ({ ...d, services: next }))}
                  disabled={formLocked}
                />
                <ServicePicker
                  label="ТО"
                  hint={formServicesToHintText(mode)}
                  hintScopeId={FORM_SERVICES_TO_HINT.scopeId}
                  hintLabel={FORM_SERVICES_TO_HINT.label}
                  ariaLabel="Выбор услуг ТО"
                  catalog={MAINTENANCE_SERVICES}
                  itemsFromProfile={visitServiceProfile.maint}
                  value={draft.maintenanceServices}
                  onChange={(next) => setDraft((d) => ({ ...d, maintenanceServices: next }))}
                  disabled={formLocked}
                />
              </>
            ) : null}
            {editingId ? (
              <div className="field field--full serviceHint__fieldWrap" id={FORM_PHOTOS_EDIT_HINT.scopeId}>
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Фото визита</span>
                  <ServiceHint scopeId={FORM_PHOTOS_EDIT_HINT.scopeId} label={FORM_PHOTOS_EDIT_HINT.label}>
                    <p className="serviceHint__panelText">{formPhotosEditHintText(editingPhotos.length)}</p>
                  </ServiceHint>
                </div>
                {editingPhotos.length ? (
                  <div className="thumbs thumbs--big" style={{ marginTop: 6 }}>
                    {editingPhotos.map((d) => (
                      <EditingVisitPhoto
                        key={d.id}
                        doc={d}
                        editAllowed={editAllowed}
                        onPickFiles={() => visitPhotosInputRef.current?.click?.()}
                        onDeleted={() => invalidateRepo()}
                        onDeleteDoc={(docId) => r.deleteDoc(id, docId)}
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
                        disabled={visitPhotosAddBlocked}
                        onClick={() => visitPhotosInputRef.current?.click?.()}
                      >
                        Добавить фото
                      </button>
                    ) : (
                      'Фото визита будут здесь.'
                    )}
                  </div>
                )}
              </div>
            ) : null}
            <div className="field field--full serviceHint__fieldWrap" id={FORM_ADD_PHOTOS_HINT.scopeId}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <ServiceHint scopeId={FORM_ADD_PHOTOS_HINT.scopeId} label={FORM_ADD_PHOTOS_HINT.label}>
                  <p className="serviceHint__panelText">{FORM_ADD_PHOTOS_HINT.text}</p>
                </ServiceHint>
              </div>
              <div className="filePick">
                <input
                  id={visitPhotosInputId}
                  className="srOnly"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={visitPhotosInputRef}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || [])
                    e.target.value = ''
                    void ingestPickedVisitPhotos(picked)
                  }}
                  disabled={formLocked || visitPhotosAddBlocked || visitPhotoBusy || detailingAwaitDraft}
                />
                <button
                  type="button"
                  className="btn filePick__btn"
                  data-variant="outline"
                  onClick={() => visitPhotosInputRef.current?.click?.()}
                  disabled={formLocked || visitPhotosAddBlocked || visitPhotoBusy || detailingAwaitDraft}
                >
                  Добавить фото
                </button>
                <span className="filePick__status">
                  {visitPhotoBusy
                    ? 'Сохраняем фото…'
                    : visitPhotosAddBlocked
                      ? `Лимит ${VISIT_MAX_PHOTOS} фото на визит`
                      : editingId && editAllowed && visitPhotosRoom < VISIT_MAX_PHOTOS
                        ? `Можно ещё ${visitPhotosRoom} фото`
                        : 'Файлы прикрепятся сразу после выбора'}
                </span>
              </div>
            </div>
            {mode === 'detailing' ? (
              <>
                <div className="historyCareTips topBorder">
                  <div className="field field--full serviceHint__fieldWrap" id={FORM_CARE_IMPORTANT_HINT.scopeId}>
                    <div className="field__top serviceHint__fieldTop">
                      <span className="field__label">
                        Важно <span className="pill" data-tone="accent">важно</span>
                      </span>
                      <ServiceHint scopeId={FORM_CARE_IMPORTANT_HINT.scopeId} label={FORM_CARE_IMPORTANT_HINT.label}>
                        <p className="serviceHint__panelText">{FORM_CARE_IMPORTANT_HINT.text}</p>
                      </ServiceHint>
                    </div>
                    <Input
                      className="input"
                      value={draft.careImportant}
                      maxLength={VISIT_CARE_TIP_MAX_LEN}
                      placeholder="Необязательно: что важно донести клиенту…"
                      disabled={formLocked}
                      onChange={(e) => setDraft((d) => ({ ...d, careImportant: e.target.value }))}
                    />
                  </div>
                  <div className="field field--full serviceHint__fieldWrap historyCareTips__sectionHead">
                    <div className="field__top serviceHint__fieldTop">
                      <span className="field__label">Советы по уходу</span>
                      <ServiceHint
                        scopeId={FORM_CARE_TIPS_SECTION_HINT.scopeId}
                        label={FORM_CARE_TIPS_SECTION_HINT.label}
                      >
                        <p className="serviceHint__panelText">{FORM_CARE_TIPS_SECTION_HINT.text}</p>
                      </ServiceHint>
                    </div>
                  </div>
                  {[
                    { key: 'careTip1', n: 1 },
                    { key: 'careTip2', n: 2 },
                    { key: 'careTip3', n: 3 },
                  ].map(({ key, n }) => (
                    <div key={key} className="field field--full">
                      <div className="field__top field__top--solo">
                        <span className="field__label">
                          Совет {n} <span className="pill" data-tone="neutral">совет</span>
                        </span>
                      </div>
                      <Input
                        className="input"
                        value={draft[key]}
                        maxLength={VISIT_CARE_TIP_MAX_LEN}
                        placeholder="Необязательно"
                        disabled={formLocked}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
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
            {!(formLocked && editingId) ? (
            <Button
              className="btn"
              variant="primary"
              disabled={formLocked || detailingAwaitDraft}
              onClick={async () => {
                try {
                  if (editingId && !editAllowed) {
                    alert(visitReadonlyFormNotice(mode, editingEvent) || 'Редактирование недоступно.')
                    return
                  }
                  const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                  if (baseMileageKm && nextMileage < baseMileageKm) {
                    alert(`Пробег не может быть меньше текущего (${baseMileageKm} км).`)
                    return
                  }
                  if (mode === 'detailing' && editingEvent?.isDraft && isIncompleteDetailingDraft(draft, baseMileageKm)) {
                    alert(
                      'Чтобы сохранить визит в истории, укажите заголовок, пробег не ниже текущего по авто и выберите хотя бы одну услугу.',
                    )
                    return
                  }
                  const payloadBase = buildVisitPayload()
                  const payload =
                    mode === 'detailing' && editingEvent?.isDraft
                      ? { ...payloadBase, isDraft: false }
                      : payloadBase

                  const evt = editingId
                    ? await r.updateEvent(id, editingId, payload)
                    : await r.addEvent(scope, id, { type: 'visit', ...payload })

                  if (!evt || !evt.id) {
                    alert(editingId ? 'Не удалось сохранить (нет прав).' : 'Не удалось добавить событие.')
                    return
                  }

                  const hasWashSave =
                    Array.isArray(draft.services) && draft.services.some((s) => WASH_SERVICE_MARKERS.has(s))
                  if (hasWashSave) {
                    const freshDocs = await r.listDocs(id)
                    const existing = (Array.isArray(freshDocs) ? freshDocs : [])
                      .filter((d) => String(d.eventId) === String(evt.id))
                      .map((d) => d.url)
                      .filter(Boolean)
                    if (existing.length) await r.updateCar(id, { washPhotos: existing.slice(0, 12) })
                  }

                  if (typeof r.syncCarWashPhotosFromLatestEvent === 'function') {
                    r.syncCarWashPhotosFromLatestEvent(id, scope)
                  }

                  setDraft({
                    title: '',
                    mileageKm: '',
                    note: '',
                    services: [],
                    maintenanceServices: [],
                    type: 'visit',
                    ...EMPTY_CARE_DRAFT,
                  })
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
                } catch (e) {
                  alert(formatHttpErrorMessage(e, 'Не удалось сохранить историю. Попробуйте ещё раз.'))
                }
              }}
            >
              Сохранить
            </Button>
            ) : null}
            {editingId && editingEvent && canEditAny(editingEvent) ? (
              <button
                className="btn"
                data-variant="danger"
                type="button"
                disabled={!editAllowed}
                onClick={async () => {
                  if (!editAllowed) {
                    alert(visitReadonlyFormNotice(mode, editingEvent) || 'Удаление недоступно.')
                    return
                  }
                  const ok = confirm('Удалить запись истории?\n\nВосстановить её будет невозможно.')
                  if (!ok) return
                  try {
                    await r.deleteEvent(id, editingId)
                  } catch {
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
            {mode === 'detailing' && editingEvent?.isDraft && !formLocked ? (
              <button
                type="button"
                className="btn"
                data-variant="outline"
                onClick={() => void saveDetailingDraftAndGoBack()}
              >
                Назад
              </button>
            ) : null}
            {mode === 'detailing' && from && !(formLocked && editingId) && !editingEvent?.isDraft ? (
              <button
                className="btn"
                data-variant="outline"
                onClick={async () => {
                  try {
                    if (editingId && !editAllowed) {
                      alert(visitReadonlyFormNotice(mode, editingEvent) || 'Редактирование недоступно.')
                      return
                    }
                    const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                    if (baseMileageKm && nextMileage < baseMileageKm) {
                      alert(`Пробег не может быть меньше текущего (${baseMileageKm} км).`)
                      return
                    }
                    const payload = { ...buildVisitPayload(), maintenanceServices: [] }

                    const evt = editingId
                      ? await r.updateEvent(id, editingId, payload)
                      : await r.addEvent(scope, id, { type: 'visit', ...payload })

                    if (!evt || !evt.id) {
                      alert(editingId ? 'Не удалось сохранить (нет прав).' : 'Не удалось добавить событие.')
                      return
                    }

                    const hasWashBack =
                      Array.isArray(draft.services) && draft.services.some((s) => WASH_SERVICE_MARKERS.has(s))
                    if (hasWashBack) {
                      const freshDocs = await r.listDocs(id)
                      const existing = (Array.isArray(freshDocs) ? freshDocs : [])
                        .filter((d) => String(d.eventId) === String(evt.id))
                        .map((d) => d.url)
                        .filter(Boolean)
                      if (existing.length) await r.updateCar(id, { washPhotos: existing.slice(0, 12) })
                    }

                    if (typeof r.syncCarWashPhotosFromLatestEvent === 'function') {
                      r.syncCarWashPhotosFromLatestEvent(id, scope)
                    }

                    invalidateRepo()
                    nav(from)
                  } catch (e) {
                    alert(formatHttpErrorMessage(e, 'Не удалось сохранить историю. Попробуйте ещё раз.'))
                  }
                }}
              >
                Сохранить и назад
              </button>
            ) : null}
            {!(mode === 'detailing' && editingEvent?.isDraft && !formLocked) ? (
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
            ) : null}
          </div>
            </>
          )}
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

