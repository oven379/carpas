import { useEffect, useMemo, useRef, useState } from 'react'

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

export function ComboBox({
  value,
  onChange,
  options,
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
  }, [options, query, maxItems])

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
      <input
        ref={inputRef}
        className="input cb__input"
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

