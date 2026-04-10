import { useEffect, useMemo, useRef, useState } from 'react'
import { DropdownCaretIcon } from './DropdownCaretIcon.jsx'

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

export function ComboBox({
  value,
  onChange,
  options,
  /** Если задано и совпадает с полем (после trim/lower), `options` уже отфильтрованы сервером — не отсекать синонимы вроде «питер» → «Санкт-Петербург». */
  optionsMatchQuery,
  placeholder,
  disabled,
  onBlur,
  emptyText = 'Ничего не найдено',
  maxItems = 80,
}) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const query = value ?? ''
  const filtered = useMemo(() => {
    const q = norm(query)
    const arr = Array.isArray(options) ? options : []
    if (!q) return arr.slice(0, maxItems)
    const matchQ = norm(String(optionsMatchQuery ?? ''))
    const trustServer =
      matchQ !== '' && matchQ === q
    if (trustServer) return arr.slice(0, maxItems)
    const starts = []
    const contains = []
    for (const opt of arr) {
      const o = String(opt || '')
      const n = norm(o)
      if (!n) continue
      if (n.startsWith(q)) starts.push(o)
      else if (n.includes(q)) contains.push(o)
      if (starts.length + contains.length >= maxItems) break
    }
    return starts.concat(contains)
  }, [options, optionsMatchQuery, query, maxItems])

  useEffect(() => {
    function onDocDown(e) {
      const el = rootRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  function commit(next) {
    onChange?.(next)
    setOpen(false)
    setActiveIdx(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="cb" ref={rootRef}>
      <div className="cb__fieldWrap">
        <input
          ref={inputRef}
          className="input cb__input cb__input--withCaret"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={() => onBlur?.()}
          onChange={(e) => {
            onChange?.(e.target.value)
            setOpen(true)
            setActiveIdx(-1)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setActiveIdx(-1)
              return
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setOpen(true)
              setActiveIdx((i) => Math.max(0, i - 1))
              return
            }
            if (e.key === 'Enter') {
              if (open && activeIdx >= 0 && activeIdx < filtered.length) {
                e.preventDefault()
                commit(filtered[activeIdx])
              }
            }
          }}
        />
        <button
          type="button"
          className="dropdownCaretBtn dropdownCaretBtn--suffix"
          tabIndex={-1}
          aria-expanded={open}
          aria-label="Показать или скрыть список"
          title="Список"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            setOpen((v) => !v)
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
        >
          <DropdownCaretIcon open={open} />
        </button>
      </div>

      {open ? (
        <div className="cb__menu" role="listbox">
          {filtered.length ? (
            filtered.map((opt, idx) => (
              <button
                key={`${opt}-${idx}`}
                type="button"
                className={`cb__item ${idx === activeIdx ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commit(opt)
                }}
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="cb__empty muted small">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

