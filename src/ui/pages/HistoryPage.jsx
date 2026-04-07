import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import {
  BackNav,
  Button,
  Card,
  DropdownCaretIcon,
  Input,
  PageLoadSpinner,
  ServiceHint,
  Textarea,
} from '../components.jsx'
import {
  clampVisitTitle,
  clampVisitTitleInput,
  fmtDateTime,
  fmtKm,
  normDigits,
  VISIT_CARE_TIP_MAX_LEN,
  VISIT_NOTE_MAX_LEN,
  VISIT_TITLE_MAX_LEN,
} from '../../lib/format.js'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  buildProfileGroupedForPicker,
  dedupeOfferedStrings,
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  normalizeCarEventServices,
  OFFERED_SERVICE_MAX_LEN,
  splitWashDetailingServices,
  visitProfileDetailingList,
  visitProfileMaintenanceList,
} from '../../lib/serviceCatalogs.js'
import { VISIT_MAX_PHOTOS } from '../../lib/uploadLimits.js'
import { buildCarFromQuery } from '../carNav.js'
import {
  FORM_ADD_PHOTOS_HINT,
  FORM_CARE_IMPORTANT_HINT,
  FORM_CARE_TIPS_SECTION_HINT,
  FORM_COMMENT_HINT,
  FORM_MILEAGE_HINT,
  FORM_PHOTOS_EDIT_HINT,
  FORM_SERVICES_DET_HINT,
  FORM_SERVICES_TO_HINT,
  FORM_TITLE_HINT,
  HISTORY_DRAFT_DET_HINT,
  HISTORY_PAGE_HINT,
  formCareImportantHintText,
  formCareTipsSectionHintText,
  formMileageHintText,
  formPhotosEditHintText,
  formTitleHintText,
  historyPageHintText,
} from '../../lib/historyVisitHints.js'
import { detailingBrandHref } from '../serviceLinkUi.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { isSameCalendarDayAsVisit, visitReadonlyFormNotice } from '../../lib/visitEditCalendar.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { ServicePicker } from '../ServicePicker.jsx'
import { resolvePublicMediaUrl } from '../../lib/mediaUrl.js'
import { carDocDeletableByOwner } from '../../lib/carDocDisplay.js'

const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000

/** Не хватает данных для «завершённого» визита — при «Назад» спрашиваем про черновик. */
function isIncompleteDetailingDraft(draft, baseMileageKm) {
  const title = String(draft.title || '').trim()
  const km = Number(String(draft.mileageKm || '0')) || 0
  if (!title) return true
  if (!km) return true
  if (baseMileageKm && km < baseMileageKm) return true
  return false
}

/** Миниатюра документа визита: при битой ссылке или пустом url — плейсхолдер. */
function HistoryEventDocThumb({ doc, canReplace, onAddPhoto, openGallery }) {
  const displayUrl = useMemo(() => resolvePublicMediaUrl(doc?.url), [doc?.url])
  const [broken, setBroken] = useState(() => !String(displayUrl).trim())
  useEffect(() => {
    setBroken(!String(displayUrl).trim())
  }, [displayUrl])
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
      src={displayUrl}
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
        <a className="thumb" href={displayUrl} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
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
      {e.note ? (
        <div className="note">
          <span className="eventLabel">Комментарий:</span> {e.note}
        </div>
      ) : null}
    </div>
  )
}

/** Фото визита в форме: превью + круг «×»; битая/пустая запись — плейсхолдер и тот же «×».
 * `canDeleteDoc` — можно ли вызвать API удаления (у владельца только для `source === 'owner'`). */
function EditingVisitPhoto({ doc, editAllowed, canDeleteDoc, onDeleted, onDeleteDoc }) {
  const displayUrl = useMemo(() => resolvePublicMediaUrl(doc?.url), [doc?.url])
  const [broken, setBroken] = useState(() => !String(displayUrl).trim())
  useEffect(() => {
    setBroken(!String(displayUrl).trim())
  }, [displayUrl])

  const remove = async (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const ok = confirm(
      broken
        ? 'Удалить эту запись о фото?'
        : 'Удалить это фото?\n\nВосстановить будет невозможно.',
    )
    if (!ok) return
    try {
      await onDeleteDoc(doc.id)
      onDeleted()
    } catch {
      alert('Не удалось удалить (нет доступа или время редактирования истекло).')
    }
  }

  return (
    <div className="thumbWrap" title={doc.title}>
      {broken ? (
        <div className="historyEditPhotoPlaceholder" aria-hidden="true">
          <span className="muted small">{editAllowed ? 'Нет файла' : 'Фото недоступно'}</span>
        </div>
      ) : (
        <a className="thumb" href={displayUrl} target="_blank" rel="noreferrer">
          <img alt={doc.title} src={displayUrl} onError={() => setBroken(true)} />
        </a>
      )}
      {canDeleteDoc ? (
        <button type="button" className="thumbX" title="Удалить фото" onClick={remove}>
          <span className="thumbX__icon" aria-hidden="true">
            ×
          </span>
        </button>
      ) : null}
    </div>
  )
}

function visitCardKey(e) {
  return String(e?.id ?? '')
}

function clampVisitNoteInput(raw) {
  return String(raw ?? '').slice(0, VISIT_NOTE_MAX_LEN)
}

/** Комментарий в форме: если в записи уже есть note — он; иначе одна строка из бывших полей услуг (при открытии старого визита). */
function visitFormNoteFromEvent(ne) {
  const base = String(ne.note || '').trim()
  if (base) return clampVisitNoteInput(base)
  const parts = []
  const ms = Array.isArray(ne.maintenanceServices) ? ne.maintenanceServices.filter(Boolean) : []
  const { wash, other } = splitWashDetailingServices(Array.isArray(ne.services) ? ne.services : [])
  if (ms.length) parts.push(`ТО: ${ms.join(', ')}`)
  if (wash.length) parts.push(`Уход: ${wash.join(', ')}`)
  if (other.length) parts.push(`Детейлинг: ${other.join(', ')}`)
  return clampVisitNoteInput(parts.join('\n'))
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
  const { detailingId, detailing, owner, mode, loading } = useDetailing()
  const ownerEmailResolved = String(owner?.email || '').trim()
  const scope = useMemo(
    () => (mode === 'owner' ? { ownerEmail: ownerEmailResolved } : { detailingId }),
    [mode, ownerEmailResolved, detailingId],
  )
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
  const visitFocusId = String(sp.get('visit') || '').trim()
  const prevHistoryCarIdRef = useRef(null)
  const visitDeepLinkDoneRef = useRef('')

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
        setEvents(Array.isArray(ev) ? ev.map(normalizeCarEventServices) : [])
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
  /** id → явно развёрнута (true) / свёрнута (false); если нет ключа — дефолт: свёрнуто, кроме черновика визита в кабинете детейлинга */
  const [visitCardExpandMap, setVisitCardExpandMap] = useState(() => ({}))

  const visitCardIsExpanded = useCallback(
    (e) => {
      const k = visitCardKey(e)
      if (!k) return Boolean(e?.isDraft && mode === 'detailing')
      const v = visitCardExpandMap[k]
      if (v === true) return true
      if (v === false) return false
      return Boolean(e?.isDraft && mode === 'detailing')
    },
    [visitCardExpandMap, mode],
  )

  const toggleVisitCardExpand = useCallback((e) => {
    const k = visitCardKey(e)
    if (!k) return
    setVisitCardExpandMap((prev) => {
      const cur =
        prev[k] === true ? true : prev[k] === false ? false : Boolean(e?.isDraft && mode === 'detailing')
      return { ...prev, [k]: !cur }
    })
  }, [mode])

  useEffect(() => {
    setVisitCardExpandMap({})
  }, [id])

  useEffect(() => {
    visitDeepLinkDoneRef.current = ''
  }, [id, visitFocusId])

  useEffect(() => {
    if (!dataReady || !visitFocusId || !id) return
    const sig = `${id}:${visitFocusId}`
    if (visitDeepLinkDoneRef.current === sig) return
    const evt = events.find((x) => String(x.id) === String(visitFocusId))
    if (!evt || evt.isDraft) return
    visitDeepLinkDoneRef.current = sig
    if (mode === 'owner') {
      setTab('all')
      setSp((prev) => {
        const next = new URLSearchParams(prev)
        next.set('t', 'all')
        return next
      }, { replace: true })
    }
    setVisitCardExpandMap((prev) => ({
      ...prev,
      [visitCardKey(evt)]: true,
    }))
    const scrollT = window.setTimeout(() => {
      document.getElementById(`history-visit-${visitFocusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(scrollT)
  }, [dataReady, visitFocusId, id, events, mode, setSp])

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
  const formTopRef = useRef(null)
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
      const ne = normalizeCarEventServices(e)
      setDraft({
        title: clampVisitTitleInput(ne.title || ''),
        mileageKm: ne.mileageKm || '',
        note:
          mode === 'detailing'
            ? clampVisitNoteInput(String(ne.note || ''))
            : visitFormNoteFromEvent(ne),
        services:
          mode === 'detailing' && Array.isArray(ne.services) ? [...ne.services] : [],
        maintenanceServices:
          mode === 'detailing' && Array.isArray(ne.maintenanceServices)
            ? [...ne.maintenanceServices]
            : [],
        type: ne.type || 'visit',
        ...careDraftFromEvent(ne),
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
          const ne = normalizeCarEventServices(evt)
          setEditingId(editParam)
          setDraft({
            title: clampVisitTitleInput(ne.title || ''),
            mileageKm: ne.mileageKm || '',
            note:
              mode === 'detailing'
                ? clampVisitNoteInput(String(ne.note || ''))
                : visitFormNoteFromEvent(ne),
            services:
              mode === 'detailing' && Array.isArray(ne.services) ? [...ne.services] : [],
            maintenanceServices:
              mode === 'detailing' && Array.isArray(ne.maintenanceServices)
                ? [...ne.maintenanceServices]
                : [],
            type: ne.type || 'visit',
            ...careDraftFromEvent(ne),
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

  const title = useMemo(() => (car ? `${car.make} ${car.model}` : ''), [car])
  const detForBadge = useMemo(() => {
    const detId = car?.detailingId
    if (!detId) return null
    const idMatch = detailingId && String(detailingId) === String(detId)
    const logoFromSession = idMatch && detailing?.logo ? String(detailing.logo).trim() : ''
    const logoFromCar = String(car?.detailingLogo || '').trim()
    return {
      id: detId,
      name: String(car.detailingName || car.seller?.name || 'Сервис').trim() || 'Сервис',
      logo: logoFromSession || logoFromCar || null,
      website: car.detailingWebsite || '',
    }
  }, [car, detailingId, detailing])
  const detBadgeLabel = detForBadge?.name ? String(detForBadge.name) : 'Детейлинг'
  const detBadgeInitials = useMemo(() => {
    const nm = String(detForBadge?.name || 'Д').trim()
    return nm.slice(0, 2).toUpperCase()
  }, [detForBadge?.name])

  const visitPickerDetGroups = useMemo(
    () => buildProfileGroupedForPicker(DETAILING_SERVICES, visitProfileDetailingList(detailing)),
    [detailing],
  )
  const visitPickerMaintGroups = useMemo(
    () => buildProfileGroupedForPicker(MAINTENANCE_SERVICES, visitProfileMaintenanceList(detailing)),
    [detailing],
  )

  const editingEvent = editingId ? events.find((x) => x.id === editingId) || null : null
  const editAllowed = Boolean(editingEvent && canEditAny(editingEvent))
  const isEditing = Boolean(editingId)
  const formLocked = isEditing && !editAllowed
  const readonlyFormNotice = editingId && !editAllowed && editingEvent ? visitReadonlyFormNotice(mode, editingEvent) : ''
  const detailingAwaitDraft = mode === 'detailing' && wantNew && !editParam

  useLayoutEffect(() => {
    if (!showNew) return
    const target =
      !detailingAwaitDraft && formTopRef.current ? formTopRef.current : formRef.current
    if (!target) return
    target.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [showNew, detailingAwaitDraft, editParam])

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

  if ((mode === 'owner' || mode === 'detailing') && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  if (!dataReady) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!car) return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />

  const carCardHref = `/car/${id}${buildCarFromQuery(sp.get('from'))}`

  const sliceCareTip = (v) => String(v ?? '').slice(0, VISIT_CARE_TIP_MAX_LEN)

  const buildVisitPayload = () => {
    const visitServicesPayload =
      mode === 'detailing'
        ? {
            services: dedupeOfferedStrings(draft.services, OFFERED_SERVICE_MAX_LEN),
            maintenanceServices: dedupeOfferedStrings(draft.maintenanceServices, OFFERED_SERVICE_MAX_LEN),
          }
        : { services: [], maintenanceServices: [] }
    return {
      title: clampVisitTitle(draft.title),
      mileageKm: draft.mileageKm,
      note: String(draft.note || '').trim().slice(0, VISIT_NOTE_MAX_LEN) || null,
      ...visitServicesPayload,
      ...(mode === 'detailing'
        ? {
            careTips: {
              important: sliceCareTip(draft.careImportant),
              tips: [sliceCareTip(draft.careTip1), sliceCareTip(draft.careTip2), sliceCareTip(draft.careTip3)],
            },
          }
        : {}),
    }
  }

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

      if (typeof r.syncCarWashPhotosFromLatestEvent === 'function') {
        r.syncCarWashPhotosFromLatestEvent(id, scope)
      }
      invalidateRepo()
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
        alert('Не удалось сохранить фото: на устройстве не хватает места для кэша.')
      } else {
        alert('Не удалось добавить фото. Попробуйте ещё раз.')
      }
    } finally {
      setVisitPhotoBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to={carCardHref}>Карточка авто</Link>
        <span> / </span>
        <span>История автомобиля</span>
      </div>
      <div className="row spread gap historyPage__titleBar">
        <div id={HISTORY_PAGE_HINT.scopeId} className="serviceHint__pageBlock historyPage__titleBlock">
          <div className="serviceHint__pageBlockRow row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to={carCardHref} title="К карточке авто" />
            <h1 className="h1">{title}</h1>
            <ServiceHint scopeId={HISTORY_PAGE_HINT.scopeId} variant="compact" label={HISTORY_PAGE_HINT.label}>
              <p className="serviceHint__panelText">{historyPageHintText(mode)}</p>
            </ServiceHint>
            {mode === 'detailing' ? (
              <ServiceHint
                scopeId={HISTORY_DRAFT_DET_HINT.scopeId}
                variant="compact"
                label={HISTORY_DRAFT_DET_HINT.label}
              >
                <p className="serviceHint__panelText">{HISTORY_DRAFT_DET_HINT.textDetailing}</p>
              </ServiceHint>
            ) : null}
          </div>
        </div>
        {mode !== 'detailing' ? (
          <div className="historyPage__newVisitWrap">
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
          </div>
        ) : null}
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
                От сервиса ({serviceEvents.length})
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
      </div>

      <div className="list">
        {visibleEvents.map((e, cardIdx) => {
          const { wash: washList, other: detList } = splitWashDetailingServices(e.services)
          const serviceCornerLogoRaw = String(e.detailingLogo || car?.detailingLogo || '').trim()
          const showDetFooter = mode === 'owner' && e.source === 'service' && detForBadge
          const showServiceCornerAvatar =
            e.source === 'service' && (mode !== 'owner' || !detForBadge)
          const serviceDetLabel = String(e.detailingName || '').trim() || 'Сервис'
          const serviceDetInitials = serviceDetLabel.slice(0, 2).toUpperCase()
          const detBrandTarget = showDetFooter ? detailingBrandHref(detForBadge) : null
          const cardInnerLink = Boolean(showDetFooter && detBrandTarget)
          const visitReadonlyCard = Boolean(canOpen(e) && !canEditAny(e))
          const visitExpanded = visitCardIsExpanded(e)
          return (
          <Card
            key={e.id}
            id={e.id ? `history-visit-${e.id}` : undefined}
            style={{ zIndex: cardIdx + 1 }}
            className={`card pad eventCard--collapsible${canOpen(e) ? ' eventCard--clickable' : ''}${visitReadonlyCard ? ' eventCard--visitReadonly' : ''}${e.isDraft ? ' eventCard--draftVisit' : ''}${showDetFooter ? ' eventCard--detFooter' : ''}`}
            role={canOpen(e) && !cardInnerLink ? 'region' : undefined}
            tabIndex={canOpen(e) ? 0 : undefined}
            onClick={(ev) => {
              const el = ev.target
              if (el && typeof el.closest === 'function' && el.closest('[data-visit-expand-toggle]')) return
              openVisitEdit(e)
            }}
            onKeyDown={(ev) => {
              if (!canOpen(e)) return
              if (ev.key !== 'Enter' && ev.key !== ' ') return
              const el = ev.target
              if (el && typeof el.closest === 'function' && el.closest('[data-visit-expand-toggle]')) return
              ev.preventDefault()
              ev.stopPropagation()
              openVisitEdit(e)
            }}
            aria-label={canOpen(e) ? (canEditAny(e) ? 'Визит: открыть редактирование' : 'Визит: открыть просмотр') : undefined}
            title={canOpen(e) ? (canEditAny(e) ? 'Нажмите, чтобы отредактировать' : 'Нажмите, чтобы посмотреть') : undefined}
          >
            <button
              type="button"
              data-visit-expand-toggle
              className="dropdownCaretBtn dropdownCaretBtn--floating"
              aria-expanded={visitExpanded}
              aria-label={visitExpanded ? 'Свернуть карточку визита' : 'Развернуть карточку визита'}
              title={visitExpanded ? 'Свернуть' : 'Развернуть'}
              onClick={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                toggleVisitCardExpand(e)
              }}
              onPointerDown={(ev) => {
                ev.stopPropagation()
              }}
              onKeyDown={(ev) => {
                ev.stopPropagation()
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  toggleVisitCardExpand(e)
                }
              }}
            >
              <DropdownCaretIcon open={visitExpanded} />
            </button>
            <div
              className={`row spread gap eventRow${showServiceCornerAvatar && visitExpanded ? ' eventRow--withServiceAvatar' : ''}`}
            >
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
                {visitExpanded && visitReadonlyCard ? (
                  <div className="visitCardReadonlyRow">
                    <span className="pill visitCardReadonlyPill" data-tone="neutral">
                      Только просмотр
                    </span>
                  </div>
                ) : null}
                {visitExpanded && e.isDraft && mode === 'detailing' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    Черновик визита · нажмите «Сохранить» в форме, чтобы запись стала частью истории
                  </div>
                ) : visitExpanded && e.source === 'service' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    {mode === 'owner' ? (
                      <>Запись сервиса</>
                    ) : visitReadonlyCard ? (
                      <>Запись сохранена · день визита прошёл, правки недоступны</>
                    ) : (
                      <>Запись из кабинета детейлинга</>
                    )}
                  </div>
                ) : visitExpanded && visitReadonlyCard && mode === 'owner' ? (
                  <div className="muted small visitCardServiceNote" style={{ marginTop: 6 }}>
                    Окно редактирования истекло
                  </div>
                ) : null}
                {visitExpanded && Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">ТО:</span> {e.maintenanceServices.join(', ')}
                  </div>
                ) : null}
                {visitExpanded && washList.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">Уход:</span> {washList.join(', ')}
                  </div>
                ) : null}
                {visitExpanded && detList.length ? (
                  <div className="rowItem__sub">
                    <span className="eventLabel">Детейлинг:</span> {detList.join(', ')}
                  </div>
                ) : null}
                {(() => {
                  const photos = docsForEvent(e.id)
                  /** В карточке визита детейлинга фото добавляем только из черновика; сохранённые визиты — через форму после входа в редактирование. */
                  const canPhotoInCard =
                    mode === 'detailing' && e.source === 'service'
                      ? Boolean(e.isDraft && canEdit(e))
                      : canEditAny(e)
                  if (!photos.length) {
                    if (!visitExpanded) return null
                    return (
                      <div className="historyCardPhotosEmpty" style={{ marginTop: 10 }}>
                        <div className="muted small">Нет добавленных фотографий.</div>
                        {canPhotoInCard ? (
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
                            canReplace={canPhotoInCard}
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
                {visitExpanded && e.note ? (
                  <div className="note">
                    <span className="eventLabel">Комментарий:</span> {e.note}
                  </div>
                ) : null}
              </div>
              {showServiceCornerAvatar && visitExpanded ? (
                <div
                  className="eventCardServiceAvatar"
                  title={serviceDetLabel}
                  aria-label={serviceDetLabel}
                  onClick={(ev) => ev.stopPropagation()}
                  onKeyDown={(ev) => ev.stopPropagation()}
                  role="img"
                >
                  <div className="eventCardServiceAvatar__inner">
                    {serviceCornerLogoRaw ? (
                      <img
                        alt=""
                        src={resolvePublicMediaUrl(serviceCornerLogoRaw)}
                        className="eventCardServiceAvatar__img"
                      />
                    ) : (
                      <span className="eventCardServiceAvatar__fallback" aria-hidden="true">
                        {serviceDetInitials}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {showDetFooter && visitExpanded ? (
              <div className="eventCardDetBadgeRow">
                {(() => {
                  const detBadgeInner = detForBadge?.logo ? (
                    <img alt="" src={resolvePublicMediaUrl(detForBadge.logo)} />
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
              <h2 className="h2 historyPage__formScrollTarget" ref={formTopRef}>
                {formHeading}
              </h2>
              {readonlyFormNotice ? (
                <div className="visitFormReadonlyNotice muted small" style={{ marginTop: 6 }}>
                  {readonlyFormNotice}
                </div>
              ) : null}
              <div className="formGrid historyFormGrid">
            <div className="field serviceHint__fieldWrap" id={FORM_TITLE_HINT.scopeId}>
              <div className="field__top serviceHint__fieldTop">
                <span className="field__label">Заголовок</span>
                <ServiceHint scopeId={FORM_TITLE_HINT.scopeId} variant="compact" label={FORM_TITLE_HINT.label}>
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
                <ServiceHint scopeId={FORM_MILEAGE_HINT.scopeId} variant="compact" label={FORM_MILEAGE_HINT.label}>
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
            {mode === 'detailing' ? (
              <>
                <ServicePicker
                  scopeId={FORM_SERVICES_DET_HINT.scopeId}
                  fieldLabel="Услуги детейлинга"
                  hintSlot={
                    <ServiceHint
                      scopeId={FORM_SERVICES_DET_HINT.scopeId}
                      variant="compact"
                      label={FORM_SERVICES_DET_HINT.label}
                    >
                      <p className="serviceHint__panelText">{FORM_SERVICES_DET_HINT.textDetailing}</p>
                    </ServiceHint>
                  }
                  groups={visitPickerDetGroups}
                  value={draft.services}
                  onChange={(next) => setDraft((d) => ({ ...d, services: next }))}
                  disabled={formLocked}
                  emptyMenuText="В настройках лендинга нет услуг детейлинга (ни из справочника, ни своих названий)."
                />
                <ServicePicker
                  scopeId={FORM_SERVICES_TO_HINT.scopeId}
                  fieldLabel="Услуги ТО"
                  hintSlot={
                    <ServiceHint
                      scopeId={FORM_SERVICES_TO_HINT.scopeId}
                      variant="compact"
                      label={FORM_SERVICES_TO_HINT.label}
                    >
                      <p className="serviceHint__panelText">{FORM_SERVICES_TO_HINT.textDetailing}</p>
                    </ServiceHint>
                  }
                  groups={visitPickerMaintGroups}
                  value={draft.maintenanceServices}
                  onChange={(next) => setDraft((d) => ({ ...d, maintenanceServices: next }))}
                  disabled={formLocked}
                  emptyMenuText="В настройках лендинга не отмечены услуги ТО."
                />
              </>
            ) : null}
            <div className="field field--full serviceHint__fieldWrap" id={FORM_COMMENT_HINT.scopeId}>
              <div className="field__top serviceHint__fieldTop">
                <span className="field__label">Комментарий</span>
                <ServiceHint scopeId={FORM_COMMENT_HINT.scopeId} variant="compact" label={FORM_COMMENT_HINT.label}>
                  <p className="serviceHint__panelText">{FORM_COMMENT_HINT.text}</p>
                </ServiceHint>
              </div>
              <Textarea
                className="textarea"
                rows={4}
                maxLength={VISIT_NOTE_MAX_LEN}
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: clampVisitNoteInput(e.target.value) }))}
                placeholder="Впишите, что и как обслуживалось — это нужно для истории вашего авто"
                disabled={formLocked}
              />
            </div>
            {editingId ? (
              <div className="field field--full serviceHint__fieldWrap" id={FORM_PHOTOS_EDIT_HINT.scopeId}>
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Фото визита</span>
                  <ServiceHint scopeId={FORM_PHOTOS_EDIT_HINT.scopeId} variant="compact" label={FORM_PHOTOS_EDIT_HINT.label}>
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
                        canDeleteDoc={
                          editAllowed &&
                          (mode === 'detailing' || carDocDeletableByOwner(d))
                        }
                        onDeleted={() => invalidateRepo()}
                        onDeleteDoc={(docId) => r.deleteDoc(id, docId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {editAllowed ? 'Пока нет фото — добавьте через кнопку ниже.' : 'Фото визита будут здесь.'}
                  </div>
                )}
                {editAllowed && !formLocked ? (
                  <div className="filePick" style={{ marginTop: 10 }}>
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
                      disabled={visitPhotosAddBlocked || visitPhotoBusy || detailingAwaitDraft}
                    />
                    <button
                      type="button"
                      className="btn filePick__btn"
                      data-variant="outline"
                      onClick={() => visitPhotosInputRef.current?.click?.()}
                      disabled={visitPhotosAddBlocked || visitPhotoBusy || detailingAwaitDraft}
                    >
                      Добавить фото
                    </button>
                    <span className="filePick__status">
                      {visitPhotoBusy
                        ? 'Сохраняем фото…'
                        : visitPhotosAddBlocked
                          ? `Лимит ${VISIT_MAX_PHOTOS} фото на визит`
                          : visitPhotosRoom < VISIT_MAX_PHOTOS
                            ? `Можно ещё ${visitPhotosRoom} фото`
                            : 'Файлы прикрепятся сразу после выбора'}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!editingId ? (
              <div className="field field--full serviceHint__fieldWrap" id={FORM_ADD_PHOTOS_HINT.scopeId}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <ServiceHint scopeId={FORM_ADD_PHOTOS_HINT.scopeId} variant="compact" label={FORM_ADD_PHOTOS_HINT.label}>
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
                        : 'Файлы прикрепятся сразу после выбора'}
                  </span>
                </div>
              </div>
            ) : null}
            {mode === 'detailing' ? (
              <div className="historyCareTips historyCareTipsForCarCard topBorder">
                <p className="muted small historyCareTipsForCarCard__intro">
                  Советы для владельца на карточке авто — в блоке «Советы» после сохранения визита. Только для кабинета детейлинга.
                </p>
                <div className="field field--full serviceHint__fieldWrap" id={FORM_CARE_IMPORTANT_HINT.scopeId}>
                  <div className="field__top serviceHint__fieldTop">
                    <span className="field__label">
                      Важно <span className="pill" data-tone="accent">Важно</span>
                    </span>
                    <ServiceHint scopeId={FORM_CARE_IMPORTANT_HINT.scopeId} variant="compact" label={FORM_CARE_IMPORTANT_HINT.label}>
                      <p className="serviceHint__panelText">{formCareImportantHintText()}</p>
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
                  <div className="muted small historyCareTips__charCount" aria-live="polite">
                    {draft.careImportant.length} / {VISIT_CARE_TIP_MAX_LEN}
                  </div>
                </div>
                <div className="field field--full serviceHint__fieldWrap historyCareTips__sectionHead">
                  <div className="field__top serviceHint__fieldTop">
                    <span className="field__label">Советы по уходу</span>
                    <ServiceHint
                      scopeId={FORM_CARE_TIPS_SECTION_HINT.scopeId}
                      variant="compact"
                      label={FORM_CARE_TIPS_SECTION_HINT.label}
                    >
                      <p className="serviceHint__panelText">{formCareTipsSectionHintText()}</p>
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
                        Совет {n} <span className="pill" data-tone="neutral">Совет</span>
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
                    <div className="muted small historyCareTips__charCount" aria-live="polite">
                      {String(draft[key] ?? '').length} / {VISIT_CARE_TIP_MAX_LEN}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
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
                      'Чтобы сохранить визит в истории, укажите заголовок и пробег не ниже текущего по авто.',
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
              <Button
                className="btn"
                variant="danger"
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
              </Button>
            ) : null}
            {mode === 'detailing' && editingEvent?.isDraft && !formLocked ? (
              <Button type="button" className="btn" variant="outline" onClick={saveDetailingDraftAndGoBack}>
                Назад
              </Button>
            ) : null}
            {mode === 'detailing' && from && !(formLocked && editingId) && !editingEvent?.isDraft ? (
              <Button
                className="btn"
                variant="outline"
                type="button"
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
                    const payload = buildVisitPayload()

                    const evt = editingId
                      ? await r.updateEvent(id, editingId, payload)
                      : await r.addEvent(scope, id, { type: 'visit', ...payload })

                    if (!evt || !evt.id) {
                      alert(editingId ? 'Не удалось сохранить (нет прав).' : 'Не удалось добавить событие.')
                      return
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
              </Button>
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

