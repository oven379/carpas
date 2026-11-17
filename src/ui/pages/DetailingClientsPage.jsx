import { Search } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { SectionTabs } from '../SectionTabs.jsx'
import { useRepo } from '../useRepo.js'
import { BackNav, Card, Input, PageLoadSpinner, Pill } from '../components.jsx'
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
import { staleVisitDays } from '../../lib/businessTypes.js'
import { photoBgStyle } from '../../lib/photoBg.js'

const CLIENT_FILTERS = new Set(['all', 'today', 'stale'])
const PAGE_SIZE = 5
/** «Визиты в ноябре»: бэкенд считает визиты с начала текущего месяца. */
const MONTH_IN_PREPOSITIONAL = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре']

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

function isLastVisitStale(row, staleDays) {
  const t = lastVisitTime(row)
  if (!t) return false
  return t < startOfLocalDay() - staleDays * 24 * 60 * 60 * 1000
}

function sortByLastVisitDesc(a, b) {
  return lastVisitTime(b) - lastVisitTime(a) || rowUpdatedTime(b) - rowUpdatedTime(a)
}

function matchesFilter(row, filter, staleDays) {
  if (filter === 'today') return isLastVisitToday(row)
  if (filter === 'stale') return isLastVisitStale(row, staleDays)
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
          className="detCrmVisitPhotos__item photoFrame"
          style={photoBgStyle(photo.url)}
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
  const { detailingId, mode, loading, detailing } = useDetailing()
  const staleDays = staleVisitDays(detailing?.businessType)
  const [data, setData] = useState({ items: [], stats: {} })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [photoLb, setPhotoLb] = useState(null)
  const [clientNoteEditing, setClientNoteEditing] = useState(false)
  const [clientNoteDraft, setClientNoteDraft] = useState('')
  const [clientDiscountDraft, setClientDiscountDraft] = useState('')
  const [clientNoteBusy, setClientNoteBusy] = useState(false)
  const query = sp.get('q') || ''
  const filterRaw = sp.get('filter') || 'all'
  const filter = CLIENT_FILTERS.has(filterRaw) ? filterRaw : 'all'
  const tabsId = useId()
  const panelId = `${tabsId}-panel`
  const selectedId = sp.get('id') || ''
  const pageRaw = parseInt(sp.get('page') || '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1

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
      .filter((row) => matchesFilter(row, filter, staleDays))
      .filter((row) => matchesQuery(row, query))
      .sort(sortByLastVisitDesc)
  }, [data.items, filter, query, staleDays])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = useMemo(() => {
    return rows.find((row) => String(row.id) === String(selectedId)) || rows[0] || null
  }, [rows, selectedId])
  useEffect(() => {
    setClientNoteEditing(false)
    setClientNoteDraft(String(selected?.client?.note || ''))
    setClientDiscountDraft(selected?.client?.discountPercent != null ? String(selected.client.discountPercent) : '')
  }, [selected?.id, selected?.client?.note, selected?.client?.discountPercent])
  const staleCount = useMemo(
    () => (data.items || []).filter((row) => isLastVisitStale(row, staleDays)).length,
    [data.items, staleDays],
  )
  const filters = useMemo(() => [
    { id: 'all', label: 'Все' },
    { id: 'today', label: 'Сегодня' },
    { id: 'stale', label: 'Давно не были', count: staleCount },
  ], [staleCount])
  function setFilter(next) {
    const n = new URLSearchParams(sp)
    if (next === 'all') n.delete('filter')
    else n.set('filter', next)
    n.delete('id')
    n.delete('page')
    setSp(n, { replace: true })
  }

  function setQuery(next) {
    const n = new URLSearchParams(sp)
    if (next) n.set('q', next)
    else n.delete('q')
    n.delete('id')
    n.delete('page')
    setSp(n, { replace: true })
  }

  function setPage(next) {
    const n = new URLSearchParams(sp)
    if (next <= 1) n.delete('page')
    else n.set('page', String(next))
    n.delete('id')
    setSp(n, { replace: true })
  }

  const profileRef = useRef(null)
  const scrollToProfileRef = useRef(false)

  function selectRow(id) {
    const n = new URLSearchParams(sp)
    n.set('id', String(id))
    setSp(n, { replace: true })
    scrollToProfileRef.current = true
  }

  async function saveClientNote() {
    if (!selected?.id || clientNoteBusy) return
    const discountRaw = clientDiscountDraft.trim()
    const discountNum = discountRaw === '' ? null : Math.min(100, Math.max(0, parseInt(discountRaw, 10) || 0))
    setClientNoteBusy(true)
    try {
      const res = await r.updateDetailingClientNote(selected.id, {
        note: clientNoteDraft,
        discountPercent: discountNum,
      })
      const note = String(res?.clientNote ?? clientNoteDraft ?? '').trim()
      const discount = res?.discountPercent != null ? res.discountPercent : discountNum
      const refreshed = await r.detailingCrmClients()
      setData({
        items: Array.isArray(refreshed?.items) ? refreshed.items : [],
        stats: refreshed?.stats && typeof refreshed.stats === 'object' ? refreshed.stats : {},
      })
      setClientNoteDraft(note)
      setClientDiscountDraft(discount != null ? String(discount) : '')
      setClientNoteEditing(false)
    } catch (e) {
      alert(formatHttpErrorMessage(e))
    } finally {
      setClientNoteBusy(false)
    }
  }

  function openLastVisitPhotos(photos, startIndex = 0) {
    const items = docsToPhotoItems(photos).map((x) => ({ url: x.url, title: x.title }))
    if (!items.length) return
    setPhotoLb({ items, startIndex })
  }

  // На узком экране карточка клиента стоит после списка: после выбора строки показываем её.
  const selectedRowId = selected?.id
  useEffect(() => {
    if (!scrollToProfileRef.current || selectedRowId == null) return
    scrollToProfileRef.current = false
    if (!window.matchMedia('(max-width: 960px)').matches) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    profileRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [selectedRowId])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/garage" replace />
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
          </div>
        </div>
        <button type="button" className="btn" data-variant="primary" onClick={() => nav('/create?from=/detailing/clients')}>
          + Добавить авто
        </button>
      </div>

      <section className="detCrm__section" aria-label="Статистика">
        <dl className="detCrmStats">
          {[
            ['Клиенты', stats.clients],
            ['Авто', stats.cars],
            [`Визиты в ${MONTH_IN_PREPOSITIONAL[new Date().getMonth()]}`, stats.visitsThisMonth],
            ['Авто с визитами', stats.withVisits],
          ].map(([label, value]) => (
            <div className="card detCrmStat" key={label}>
              <dt>{label}</dt>
              <dd>{Number(value) || 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      {error ? <Card className="card pad detCrm__error">{error}</Card> : null}

      <div className={`detCrm__layout${selected ? ' detCrm__layout--withProfile' : ''}`}>
        <section className="detCrm__main" aria-labelledby="detCrmClientsTitle">
          <h2 className="h2 detCrm__sectionTitle" id="detCrmClientsTitle">Клиенты</h2>
          <div className="detCrm__toolbar">
            <SectionTabs
              tabsId={tabsId}
              panelId={panelId}
              label="Фильтр клиентов"
              tabs={filters.map(({ id, label, count }) => ({
                key: id,
                label: count > 0 ? `${label} (${count > 9 ? '9+' : count})` : label,
              }))}
              selectedTab={filter}
              onSelect={setFilter}
            />
            <div className="detCrm__search">
              <Search className="detCrm__searchIcon" size={18} aria-hidden="true" />
              <Input
                className="input"
                value={query}
                placeholder="Поиск по имени, телефону, VIN или госномеру"
                aria-label="Поиск клиентов и автомобилей"
                autoCapitalize="off"
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div
            className="detCrm__results"
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${tabsId}-tab-${filter}`}
          >
            <Card className="card detCrm__listCard">
              <div className="detCrm__listHead">
                <span>Клиент</span>
                <span>Автомобиль</span>
                <span>Последний визит</span>
              </div>
              <div className="detCrm__rows">
                {pageRows.map((row) => {
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
              {totalPages > 1 ? (
                <div className="detCrm__pagination">
                  <button
                    type="button"
                    className="detCrm__pageBtn"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`detCrm__pageBtn${p === currentPage ? ' is-active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="detCrm__pageBtn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    →
                  </button>
                  <span className="detCrm__pageInfo muted small">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} из {rows.length}
                  </span>
                </div>
              ) : null}
            </Card>
          </div>
        </section>

        {selected ? (
          <aside ref={profileRef} className="detCrm__side" aria-label="Карточка клиента">
            <Card className="card pad detCrmProfile">
              <div className="detCrmProfile__top">
                <div className="detCrmProfile__avatar"><ClientAvatar row={selected} /></div>
                <div className="detCrmProfile__identity">
                  <h2 className="h2 detCrmProfile__title">{clientName(selected)}</h2>
                  <div className="detCrmProfile__phoneLine">
                    <span className="detCrmProfile__phoneLabel">тел:</span>
                    {phone.telHref ? (
                      <a className="detCrmProfile__phone" href={phone.telHref}>{phone.display}</a>
                    ) : (
                      <span className="detCrmProfile__phone is-empty">не указан</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="detCrmProfile__car">
                <h4 className="detCrmProfile__blockTitle">Автомобиль</h4>
                <div className="detCrmProfile__carTitle">{carTitle(selected)}</div>
                <div className="muted small">
                  {[selectedCar.year ? `${selectedCar.year} г` : '', selectedCar.mileageKm ? fmtKm(selectedCar.mileageKm) : '', fmtPlateFull(selectedCar.plate, selectedCar.plateRegion)].filter(Boolean).join(' · ') || 'Данные авто не заполнены'}
                </div>
                <div className="detCrmProfile__actions">
                  <button
                    type="button"
                    className="btn detCrmProfile__historyBtn"
                    data-variant="primary"
                    onClick={() => nav(`/car/${selected.id}?from=${encodeURIComponent(from)}`)}
                  >
                    Открыть авто
                  </button>
                  <button
                    type="button"
                    className="btn"
                    data-variant="ghost"
                    onClick={() => nav(`/car/${selected.id}/history?from=${encodeURIComponent(from)}`)}
                  >
                    История авто
                  </button>
                </div>
              </div>

              <div className="detCrmProfile__clientNote">
                <div className="detCrmProfile__clientNoteHead">
                  <h4 className="detCrmProfile__blockTitle">Заметка по клиенту</h4>
                  {!clientNoteEditing ? (
                    <button
                      type="button"
                      className="detCrmProfile__textAction"
                      onClick={() => {
                        setClientNoteDraft(String(selectedClient.note || ''))
                        setClientDiscountDraft(selectedClient.discountPercent != null ? String(selectedClient.discountPercent) : '')
                        setClientNoteEditing(true)
                      }}
                    >
                      {String(selectedClient.note || '').trim() || selectedClient.discountPercent != null ? 'Изменить' : 'Добавить'}
                    </button>
                  ) : null}
                </div>
                {!clientNoteEditing && selectedClient.discountPercent != null ? (
                  <div className="detCrmProfile__discount">
                    <span className="detCrmProfile__discountBadge">−{selectedClient.discountPercent}%</span>
                    <span className="muted small">постоянная скидка</span>
                  </div>
                ) : null}
                {clientNoteEditing ? (
                  <div className="detCrmProfile__clientNoteEditor">
                    <div className="detCrmProfile__discountRow">
                      <input
                        type="number"
                        className="input detCrmProfile__discountInput"
                        value={clientDiscountDraft}
                        min={0}
                        max={100}
                        step={1}
                        placeholder="Скидка, %"
                        aria-label="Скидка в процентах"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                          setClientDiscountDraft(v === '' ? '' : String(Math.min(100, parseInt(v, 10) || 0)))
                        }}
                      />
                    </div>
                    <textarea
                      className="input"
                      value={clientNoteDraft}
                      rows={4}
                      maxLength={1000}
                      placeholder="Заметка о клиенте"
                      aria-label="Заметка о клиенте"
                      onChange={(e) => setClientNoteDraft(e.target.value)}
                    />
                    <div className="detCrmProfile__clientNoteActions">
                      <span className="muted small">{clientNoteDraft.length} / 1000</span>
                      <button
                        type="button"
                        className="btn"
                        data-variant="ghost"
                        disabled={clientNoteBusy}
                        onClick={() => {
                          setClientNoteDraft(String(selectedClient.note || ''))
                          setClientDiscountDraft(selectedClient.discountPercent != null ? String(selectedClient.discountPercent) : '')
                          setClientNoteEditing(false)
                        }}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        className="btn"
                        data-variant="primary"
                        disabled={clientNoteBusy}
                        onClick={() => void saveClientNote()}
                      >
                        {clientNoteBusy ? 'Сохраняем...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`detCrmProfile__clientNoteText${String(selectedClient.note || '').trim() ? '' : ' is-empty'}`}>
                    {String(selectedClient.note || '').trim() || 'Постоянная заметка для менеджера: предпочтения, удобное время звонка, важные детали.'}
                  </p>
                )}
              </div>

              <div className="detCrmProfile__block">
                <h4 className="detCrmProfile__blockTitle">Последний визит</h4>
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

              <button
                type="button"
                className="btn detCrmProfile__visitBtn"
                data-variant="primary"
                onClick={() => nav(`/car/${selected.id}/history?new=1&from=${encodeURIComponent(from)}`)}
              >
                Добавить визит
              </button>
            </Card>
          </aside>
        ) : null}
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
