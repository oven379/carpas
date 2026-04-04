import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const AUTO_CLOSE_MS = 30000
const STORAGE_KEY = 'carPass.serviceHint.usage.v1'
const MAX_OPENS = 3
const QUIET_MONTHS = 3

const PANEL_MARGIN = 12
const PANEL_GAP = 8
const PANEL_MAX_WIDTH = 440

function readAll() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}

function quietUntilExpired(iso) {
  if (!iso) return true
  const t = new Date(iso).getTime()
  return !Number.isFinite(t) || Date.now() >= t
}

/** После даты тишины — снова даём MAX_OPENS показов. */
function normalizeScopeState(raw) {
  const opens = typeof raw?.opens === 'number' && raw.opens >= 0 ? raw.opens : 0
  let quietUntil = typeof raw?.quietUntil === 'string' ? raw.quietUntil : null
  if (quietUntil && quietUntilExpired(quietUntil)) {
    quietUntil = null
    return { opens: 0, quietUntil: null, wasReset: true }
  }
  return { opens, quietUntil, wasReset: false }
}

function loadUsage(scopeId) {
  if (!scopeId) return { opens: 0, quietUntil: null }
  const all = readAll()
  const prev = all[scopeId]
  const { opens, quietUntil, wasReset } = normalizeScopeState(prev)
  if (wasReset) {
    all[scopeId] = { opens: 0, quietUntil: null }
    writeAll(all)
  }
  return { opens, quietUntil }
}

function addMonthsFromNow(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

/** Позиция панели компактной подсказки в пределах вьюпорта (в т.ч. узкий телефон). */
function computeCompactPlacement(btnEl, panelEl) {
  if (!btnEl || !panelEl) return null
  const br = btnEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = Math.max(200, vw - 2 * PANEL_MARGIN)
  const width = Math.min(PANEL_MAX_WIDTH, maxW)
  let left = br.left
  if (left + width > vw - PANEL_MARGIN) left = vw - PANEL_MARGIN - width
  if (left < PANEL_MARGIN) left = PANEL_MARGIN
  let top = br.bottom + PANEL_GAP
  const ph = panelEl.offsetHeight
  if (top + ph > vh - PANEL_MARGIN && br.top - ph - PANEL_GAP >= PANEL_MARGIN) {
    top = br.top - ph - PANEL_GAP
  }
  if (top < PANEL_MARGIN) top = PANEL_MARGIN
  return { top, left, width }
}

/**
 * Справка по полю (сетка) или компактная кнопка у заголовка.
 * Закрытие: снаружи, Escape, клик по панели, автоматически через 30 с.
 * Кнопка «i» срабатывает MAX_OPENS раз; после этого скрывается на QUIET_MONTHS календарных месяцев.
 * Компактная панель рендерится в document.body с position: fixed, чтобы не обрезалась и не вылезала за экран.
 */
export default function ServiceHint({ scopeId, label, children, variant = 'field' }) {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState(() => loadUsage(scopeId))
  const [compactStyle, setCompactStyle] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    setUsage(loadUsage(scopeId))
  }, [scopeId])

  const showButton = useMemo(() => {
    if (!scopeId) return true
    if (usage.quietUntil && !quietUntilExpired(usage.quietUntil)) return false
    return true
  }, [scopeId, usage.quietUntil])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open || !scopeId) return undefined
    const onDoc = (e) => {
      const t = e.target
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      const byIdRoot = document.getElementById(scopeId)
      if (byIdRoot?.contains(t)) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    document.addEventListener('touchstart', onDoc, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open, scopeId, close])

  useEffect(() => {
    if (!open) return undefined
    const t = window.setTimeout(close, AUTO_CLOSE_MS)
    return () => window.clearTimeout(t)
  }, [open, close])

  const applyCompactPlacement = useCallback(() => {
    if (variant !== 'compact' || !open) return
    const btn = btnRef.current
    const panel = panelRef.current
    if (!btn || !panel) return
    const next = computeCompactPlacement(btn, panel)
    if (next) setCompactStyle(next)
  }, [variant, open])

  useLayoutEffect(() => {
    if (!open || variant !== 'compact') {
      setCompactStyle(null)
      return undefined
    }
    applyCompactPlacement()
    const raf = requestAnimationFrame(() => applyCompactPlacement())
    window.addEventListener('resize', applyCompactPlacement)
    window.addEventListener('scroll', applyCompactPlacement, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', applyCompactPlacement)
      window.removeEventListener('scroll', applyCompactPlacement, true)
    }
  }, [open, variant, applyCompactPlacement, children])

  const onToggle = useCallback(
    (e) => {
      e.stopPropagation()
      if (!open) {
        if (scopeId) {
          const all = readAll()
          const cur = normalizeScopeState(all[scopeId])
          if (cur.quietUntil && !quietUntilExpired(cur.quietUntil)) return
          const opens = cur.opens + 1
          const next =
            opens >= MAX_OPENS
              ? { opens, quietUntil: addMonthsFromNow(QUIET_MONTHS) }
              : { opens, quietUntil: null }
          all[scopeId] = next
          writeAll(all)
          setUsage(next)
        }
        setOpen(true)
      } else {
        setOpen(false)
      }
    },
    [open, scopeId],
  )

  const panelClass =
    variant === 'compact' ? 'serviceHint__panel serviceHint__panel--dropdown' : 'serviceHint__panel'

  const compactFixedStyle =
    variant === 'compact' && open
      ? compactStyle
        ? {
            position: 'fixed',
            zIndex: 6000,
            top: compactStyle.top,
            left: compactStyle.left,
            width: compactStyle.width,
            maxWidth: compactStyle.width,
            margin: 0,
            opacity: 1,
            pointerEvents: 'auto',
          }
        : {
            position: 'fixed',
            zIndex: 6000,
            top: PANEL_MARGIN,
            left: PANEL_MARGIN,
            width: Math.min(
              PANEL_MAX_WIDTH,
              Math.max(200, (typeof window !== 'undefined' ? window.innerWidth : PANEL_MAX_WIDTH) - 2 * PANEL_MARGIN),
            ),
            maxWidth: Math.min(
              PANEL_MAX_WIDTH,
              Math.max(200, (typeof window !== 'undefined' ? window.innerWidth : PANEL_MAX_WIDTH) - 2 * PANEL_MARGIN),
            ),
            margin: 0,
            opacity: 0,
            pointerEvents: 'none',
          }
      : undefined

  const panelInner = (
    <div
      ref={panelRef}
      className={panelClass}
      id={scopeId ? `${scopeId}-panel` : undefined}
      role="region"
      aria-label={label}
      onClick={close}
      style={variant === 'compact' && open ? compactFixedStyle : undefined}
    >
      <div className="serviceHint__panelInner">{children}</div>
      <div className="serviceHint__panelTapHint">Нажмите, чтобы закрыть</div>
    </div>
  )

  const btn = showButton ? (
    <button
      ref={btnRef}
      type="button"
      className="serviceHint__btn"
      aria-expanded={open}
      aria-controls={open && scopeId ? `${scopeId}-panel` : undefined}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <svg className="serviceHint__btnSvg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="8" r="1.35" fill="currentColor" />
        <path fill="currentColor" d="M11 11h2v7h-2v-7z" />
      </svg>
    </button>
  ) : null

  if (variant === 'compact') {
    const portaled = open && typeof document !== 'undefined' ? createPortal(panelInner, document.body) : null
    return (
      <>
        {btn}
        {portaled}
      </>
    )
  }

  return (
    <>
      {btn}
      {open ? panelInner : null}
    </>
  )
}
