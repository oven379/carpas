import { useEffect, useMemo, useRef, useState } from 'react'
import { DropdownCaretIcon } from './DropdownCaretIcon.jsx'

/**
 * Выпадающий мультивыбор услуг из заранее сгруппированного профиля (см. buildProfileGroupedForPicker).
 */
export function ServicePicker({
  scopeId,
  fieldLabel,
  hintSlot,
  groups,
  value,
  onChange,
  disabled,
  emptyMenuText = 'Нет позиций для выбора.',
  chooseLabel = 'Выбрать из списка',
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef(null)
  const selected = Array.isArray(value) ? value : []

  useEffect(() => {
    if (!open) return
    const onDoc = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const qn = q.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!qn) return groups
    return groups
      .map((g) => ({
        ...g,
        items: (g.items || []).filter((it) => String(it).toLowerCase().includes(qn)),
      }))
      .filter((g) => (g.items || []).length > 0)
  }, [groups, qn])

  const toggleItem = (it) => {
    const s = String(it)
    if (disabled) return
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s])
  }

  const removeChip = (it) => {
    if (disabled) return
    onChange(selected.filter((x) => x !== it))
  }

  const meta = selected.length ? `${selected.length} выбрано` : 'не выбрано'

  return (
    <div className={`field field--full serviceHint__fieldWrap${disabled ? ' svcdd--disabled' : ''}`} id={scopeId}>
      <div className="field__top serviceHint__fieldTop">
        <span className="field__label">{fieldLabel}</span>
        {hintSlot}
      </div>
      <div className="svcdd" ref={rootRef}>
        <div className="svcdd__anchor">
          <button
            type="button"
            className="btn svcdd__btn input"
            data-variant="outline"
            disabled={disabled}
            aria-expanded={open ? 'true' : 'false'}
            aria-haspopup="dialog"
            onClick={() => !disabled && setOpen((o) => !o)}
          >
            <span>{chooseLabel}</span>
            <span className="svcdd__btnRight">
              <span className="svcdd__meta muted">{meta}</span>
              <DropdownCaretIcon open={open} />
            </span>
          </button>
          {open ? (
            <div className="svcdd__menu" role="dialog" aria-label={fieldLabel}>
              <div className="svcdd__top">
                <input
                  type="search"
                  className="input svcdd__search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск…"
                  aria-label="Поиск по услугам"
                />
                <button type="button" className="btn" data-variant="primary" onClick={() => setOpen(false)}>
                  Готово
                </button>
              </div>
              <div className="svcdd__list">
                {!groups.length ? (
                  <p className="muted small" style={{ margin: 0 }}>
                    {emptyMenuText}
                  </p>
                ) : !filteredGroups.length ? (
                  <p className="muted small" style={{ margin: 0 }}>
                    Ничего не найдено.
                  </p>
                ) : (
                  filteredGroups.map((g) => (
                    <details key={g.title} className="svcdd__group" open>
                      <summary className="svcdd__title">
                        <span>{g.title}</span>
                        <span className="svcdd__count">{(g.items || []).length}</span>
                      </summary>
                      <div className="svcdd__grid">
                        {(g.items || []).map((it) => {
                          const on = selected.includes(it)
                          return (
                            <button
                              key={it}
                              type="button"
                              className={`svcdd__item${on ? ' is-on' : ''}`}
                              onClick={() => toggleItem(it)}
                            >
                              <span className="svcdd__check" aria-hidden="true">
                                {on ? '✓' : ''}
                              </span>
                              <span>{it}</span>
                            </button>
                          )
                        })}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        {selected.length ? (
          <div className="svcdd__chips">
            {selected.map((it) => (
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
        ) : null}
      </div>
    </div>
  )
}
