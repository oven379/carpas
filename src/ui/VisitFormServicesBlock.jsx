import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildProfileGroupedForPicker,
  buildProfileGroupedForPickerByGroupTitles,
  dedupeOfferedStrings,
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  OFFERED_SERVICE_MAX_LEN,
  VISIT_FORM_BODY_PAINT_GENERIC,
  VISIT_FORM_CHASSIS_MAINT_GROUPS,
  VISIT_FORM_ENGINE_MAINT_GROUPS,
  visitFormBodySelectableStrings,
  visitFormDetailingFlatForPicker,
  visitFormMaintenanceFlatForPicker,
  visitFormPaintPartLabels,
  visitFormRouteServiceToPayloadField,
  visitFormSearchableOptionStrings,
  visitProfileDetailingList,
} from '../lib/serviceCatalogs.js'

function toggleListItem(list, item, on) {
  const s = String(item)
  const cur = Array.isArray(list) ? list : []
  if (on) return cur.includes(s) ? cur : [...cur, s]
  return cur.filter((x) => x !== s)
}

function SectionGrid({ items, selected, disabled, onToggle }) {
  if (!items.length) {
    return (
      <p className="muted small visitFormSvc__empty">Нет позиций для выбора в этой категории.</p>
    )
  }
  return (
    <div className="svcdd__grid visitFormSvc__grid">
      {items.map((it) => {
        const on = selected.includes(it)
        return (
          <button
            key={it}
            type="button"
            className={`svcdd__item${on ? ' is-on' : ''}`}
            disabled={disabled}
            onClick={() => onToggle(it, !on)}
          >
            <span className="svcdd__check" aria-hidden="true">
              {on ? '✓' : ''}
            </span>
            <span>{it}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Услуги визита: поиск, кузов (профиль или полный справочник + покраска по деталям), ДВС, ходовая, другое.
 * @param {boolean} [useFullCatalogFallback] — для владельца: весь справочник вместо профиля лендинга.
 */
export function VisitFormServicesBlock({
  scopeId,
  fieldLabel = 'Услуги визита',
  hintSlot,
  detailing,
  useFullCatalogFallback = false,
  services,
  maintenanceServices,
  onServicesChange,
  onMaintenanceChange,
  disabled,
}) {
  const [searchQ, setSearchQ] = useState('')
  const [sugOpen, setSugOpen] = useState(false)
  const rootRef = useRef(null)
  const searchRef = useRef(null)

  const svc = Array.isArray(services) ? services : []
  const maint = Array.isArray(maintenanceServices) ? maintenanceServices : []

  const catalogOpts = useMemo(() => ({ useFullCatalog: useFullCatalogFallback }), [useFullCatalogFallback])
  const searchable = useMemo(() => visitFormSearchableOptionStrings(detailing, catalogOpts), [detailing, catalogOpts])
  const bodyKnownSet = useMemo(
    () => new Set(visitFormBodySelectableStrings(detailing, catalogOpts)),
    [detailing, catalogOpts],
  )

  const detFlat = useMemo(
    () => visitFormDetailingFlatForPicker(detailing, useFullCatalogFallback),
    [detailing, useFullCatalogFallback],
  )
  const maintFlat = useMemo(
    () => visitFormMaintenanceFlatForPicker(detailing, useFullCatalogFallback),
    [detailing, useFullCatalogFallback],
  )

  const detGroups = useMemo(
    () => buildProfileGroupedForPicker(DETAILING_SERVICES, detFlat),
    [detFlat],
  )
  const engGroups = useMemo(
    () =>
      buildProfileGroupedForPickerByGroupTitles(
        MAINTENANCE_SERVICES,
        maintFlat,
        VISIT_FORM_ENGINE_MAINT_GROUPS,
      ),
    [maintFlat],
  )
  const chassisGroups = useMemo(
    () =>
      buildProfileGroupedForPickerByGroupTitles(
        MAINTENANCE_SERVICES,
        maintFlat,
        VISIT_FORM_CHASSIS_MAINT_GROUPS,
      ),
    [maintFlat],
  )

  const paintLabelsForUi = useMemo(() => {
    const all = visitFormPaintPartLabels()
    if (useFullCatalogFallback) return all
    const pset = new Set(visitProfileDetailingList(detailing))
    return all.filter((x) => pset.has(x))
  }, [detailing, useFullCatalogFallback])

  const showPaintGenericRow =
    useFullCatalogFallback || detFlat.includes(VISIT_FORM_BODY_PAINT_GENERIC)
  const showPaintSubBlock = showPaintGenericRow || paintLabelsForUi.length > 0

  const qn = searchQ.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!qn) return []
    return searchable.all.filter((s) => String(s).toLowerCase().includes(qn)).slice(0, 50)
  }, [searchable.all, qn])

  const otherServices = useMemo(() => svc.filter((s) => !bodyKnownSet.has(s)), [svc, bodyKnownSet])

  useEffect(() => {
    if (!sugOpen) return
    const onDoc = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) setSugOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [sugOpen])

  const applyServices = (next) => onServicesChange(dedupeOfferedStrings(next, OFFERED_SERVICE_MAX_LEN))
  const applyMaint = (next) => onMaintenanceChange(dedupeOfferedStrings(next, OFFERED_SERVICE_MAX_LEN))

  const addCanonical = (label) => {
    const s = dedupeOfferedStrings([label], OFFERED_SERVICE_MAX_LEN)[0]
    if (!s) return
    const field = visitFormRouteServiceToPayloadField(s)
    if (field === 'maintenanceServices') {
      applyMaint(toggleListItem(maint, s, true))
    } else {
      applyServices(toggleListItem(svc, s, true))
    }
  }

  const removeChip = (label) => {
    const s = String(label)
    if (svc.includes(s)) applyServices(svc.filter((x) => x !== s))
    if (maint.includes(s)) applyMaint(maint.filter((x) => x !== s))
  }

  const toggleBodyItem = (it, on) => {
    applyServices(toggleListItem(svc, it, on))
  }

  const toggleMaintItem = (it, on) => {
    applyMaint(toggleListItem(maint, it, on))
  }

  const submitSearch = () => {
    const raw = searchQ.trim()
    if (!raw) return
    const low = raw.toLowerCase()
    const exact = searchable.all.find((s) => String(s).toLowerCase() === low)
    if (exact) {
      addCanonical(exact)
      setSearchQ('')
      setSugOpen(false)
      return
    }
    const partial = searchable.all.filter((s) => String(s).toLowerCase().includes(low))
    if (partial.length === 1) {
      addCanonical(partial[0])
      setSearchQ('')
      setSugOpen(false)
      return
    }
    if (useFullCatalogFallback) {
      addCanonical(raw)
      setSearchQ('')
      setSugOpen(false)
      return
    }
    alert(
      'Этой услуги нет в списке вашего лендинга. Добавьте её в настройках лендинга и сохраните — тогда она появится в визите.',
    )
  }

  const selectedAll = useMemo(() => [...svc, ...maint], [svc, maint])
  const meta = selectedAll.length ? `${selectedAll.length} выбрано` : 'не выбрано'

  const paintGenericOn = svc.includes(VISIT_FORM_BODY_PAINT_GENERIC)

  return (
    <div
      className={`field field--full serviceHint__fieldWrap visitFormSvc${disabled ? ' visitFormSvc--disabled' : ''}`}
      id={scopeId}
      ref={rootRef}
    >
      <div className="field__top serviceHint__fieldTop">
        <span className="field__label">{fieldLabel}</span>
        {hintSlot}
      </div>

      <div className="visitFormSvc__searchRow">
        <div className="visitFormSvc__searchWrap">
          <input
            ref={searchRef}
            type="search"
            className="input visitFormSvc__search"
            value={searchQ}
            disabled={disabled}
            placeholder="Поиск услуги…"
            aria-label="Поиск и добавление услуги"
            aria-autocomplete="list"
            aria-expanded={sugOpen ? 'true' : 'false'}
            onChange={(e) => {
              setSearchQ(e.target.value)
              setSugOpen(true)
            }}
            onFocus={() => setSugOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitSearch()
              }
              if (e.key === 'Escape') setSugOpen(false)
            }}
          />
          {sugOpen && qn && suggestions.length ? (
            <ul className="visitFormSvc__suggest" role="listbox">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="visitFormSvc__suggestBtn"
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addCanonical(s)
                      setSearchQ('')
                      setSugOpen(false)
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="btn" data-variant="outline" disabled={disabled} onClick={submitSearch}>
          Добавить
        </button>
      </div>

      {selectedAll.length ? (
        <div className="svcdd__chips visitFormSvc__chips">
          {selectedAll.map((it) => (
            <button
              key={it}
              type="button"
              className="svcdd__chip"
              disabled={disabled}
              title="Снять выбор"
              onClick={() => removeChip(it)}
            >
              {it}
              <span aria-hidden="true"> ×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small visitFormSvc__meta">{meta}</p>
      )}

      <details className="svcdd__group visitFormSvc__details" open>
        <summary className="svcdd__title visitFormSvc__summary">
          <span>Кузов</span>
          <span className="svcdd__count">
            {detGroups.reduce((n, g) => n + (g.items || []).length, 0) +
              (showPaintGenericRow ? 1 : 0) +
              paintLabelsForUi.length}
          </span>
        </summary>
        <div className="visitFormSvc__detailsBody">
          {!detGroups.length && !showPaintSubBlock ? (
            <p className="muted small visitFormSvc__empty">
              {useFullCatalogFallback
                ? 'Справочник детейлинга недоступен.'
                : 'В настройках лендинга нет услуг детейлинга (ни из справочника, ни своих названий).'}
            </p>
          ) : null}
          {detGroups.map((g) => (
            <div key={g.title} className="visitFormSvc__subBlock">
              <div className="visitFormSvc__subLabel">{g.title}</div>
              <SectionGrid items={g.items || []} selected={svc} disabled={disabled} onToggle={toggleBodyItem} />
            </div>
          ))}
          {showPaintSubBlock ? (
            <div className="visitFormSvc__subBlock">
              {showPaintGenericRow ? (
                <>
                  <div className="visitFormSvc__subLabel">Покраска</div>
                  <div className="svcdd__grid visitFormSvc__grid">
                    <button
                      type="button"
                      className={`svcdd__item${paintGenericOn ? ' is-on' : ''}`}
                      disabled={disabled}
                      onClick={() => toggleBodyItem(VISIT_FORM_BODY_PAINT_GENERIC, !paintGenericOn)}
                    >
                      <span className="svcdd__check" aria-hidden="true">
                        {paintGenericOn ? '✓' : ''}
                      </span>
                      <span>{VISIT_FORM_BODY_PAINT_GENERIC}</span>
                    </button>
                  </div>
                </>
              ) : null}
              {paintLabelsForUi.length ? (
                <>
                  <div
                    className={`visitFormSvc__subLabel${showPaintGenericRow ? ' visitFormSvc__subLabel--tight' : ''}`}
                  >
                    По элементам кузова
                  </div>
                  <SectionGrid
                    items={paintLabelsForUi}
                    selected={svc}
                    disabled={disabled}
                    onToggle={toggleBodyItem}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <details className="svcdd__group visitFormSvc__details">
        <summary className="svcdd__title visitFormSvc__summary">
          <span>ДВС</span>
          <span className="svcdd__count">{engGroups.reduce((n, g) => n + (g.items || []).length, 0)}</span>
        </summary>
        <div className="visitFormSvc__detailsBody">
          {!engGroups.length ? (
            <p className="muted small visitFormSvc__empty">В профиле не отмечены услуги ТО для двигателя и смежных систем.</p>
          ) : (
            engGroups.map((g) => (
              <div key={g.title} className="visitFormSvc__subBlock">
                <div className="visitFormSvc__subLabel">{g.title}</div>
                <SectionGrid items={g.items || []} selected={maint} disabled={disabled} onToggle={toggleMaintItem} />
              </div>
            ))
          )}
        </div>
      </details>

      <details className="svcdd__group visitFormSvc__details">
        <summary className="svcdd__title visitFormSvc__summary">
          <span>Ходовая</span>
          <span className="svcdd__count">{chassisGroups.reduce((n, g) => n + (g.items || []).length, 0)}</span>
        </summary>
        <div className="visitFormSvc__detailsBody">
          {!chassisGroups.length ? (
            <p className="muted small visitFormSvc__empty">В профиле не отмечены услуги ТО по ходовой части.</p>
          ) : (
            chassisGroups.map((g) => (
              <div key={g.title} className="visitFormSvc__subBlock">
                <div className="visitFormSvc__subLabel">{g.title}</div>
                <SectionGrid items={g.items || []} selected={maint} disabled={disabled} onToggle={toggleMaintItem} />
              </div>
            ))
          )}
        </div>
      </details>

      <details className="svcdd__group visitFormSvc__details">
        <summary className="svcdd__title visitFormSvc__summary">
          <span>Другое</span>
          {otherServices.length ? <span className="svcdd__count">{otherServices.length}</span> : null}
        </summary>
        <div className="visitFormSvc__detailsBody">
          <p className="muted small" style={{ margin: '0 0 10px' }}>
            {useFullCatalogFallback ? (
              <>
                Если названия нет в подсказках поиска, введите свой текст и нажмите «Добавить» — услуга сохранится в
                визите и отображается здесь и в общем списке выше.
              </>
            ) : (
              <>
                Произвольную строку через поиск добавить нельзя — только услуги из настроек лендинга. Ниже — позиции,
                уже сохранённые в этом визите, которых нет в текущем списке кузова (например, после смены профиля).
              </>
            )}
          </p>
          {otherServices.length ? (
            <div className="svcdd__grid visitFormSvc__grid">
              {otherServices.map((it) => {
                const on = true
                return (
                  <button
                    key={it}
                    type="button"
                    className={`svcdd__item${on ? ' is-on' : ''}`}
                    disabled={disabled}
                    onClick={() => toggleBodyItem(it, false)}
                  >
                    <span className="svcdd__check" aria-hidden="true">
                      ✓
                    </span>
                    <span>{it}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="muted small visitFormSvc__empty">
              {useFullCatalogFallback ? 'Пока нет услуг вне списка кузова.' : 'Нет позиций вне списка лендинга.'}
            </p>
          )}
        </div>
      </details>
    </div>
  )
}
