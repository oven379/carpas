import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const AUTO_CLOSE_MS = 30000
const STORAGE_KEY_V2 = 'carPass.serviceHint.usage.v2'
const STORAGE_KEY_V1 = 'carPass.serviceHint.usage.v1'
const MAX_CLOSE_CYCLES = 3

const PANEL_MARGIN = 12
const PANEL_GAP = 8
const PANEL_MAX_WIDTH = 440

function readAll() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}

function migrateV1IfNeeded(scopeId, all) {
  if (!scopeId || all[scopeId]) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V1)
    if (!raw) return
    const v1 = JSON.parse(raw)
    const prev = v1?.[scopeId]
    const opens = typeof prev?.opens === 'number' ? prev.opens : 0
    if (opens >= 3) {
      all[scopeId] = { cycles: 3, permanent: true }
      writeAll(all)
    }
  } catch {
    /* ignore */
  }
}

function loadUsage(scopeId) {
  if (!scopeId) return { cycles: 0, permanent: false }
  const snapshot = readAll()
  migrateV1IfNeeded(scopeId, snapshot)
  const cur = readAll()[scopeId]
  if (!cur) return { cycles: 0, permanent: false }
  const cycles = typeof cur.cycles === 'number' ? cur.cycles : 0
  const permanent = Boolean(cur.permanent || cycles >= MAX_CLOSE_CYCLES)
  return { cycles, permanent }
}

/** Позиция панели в пределах вьюпорта (в т.ч. узкий телефон). */
function computeDropdownPlacement(btnEl, panelEl) {
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
 * Подсказка: кнопка «i» + выпадающая панель (портал в body).
 * Закрытие: клик по панели, снаружи, Escape, кнопка «i»; авто через 30 с (не считается в лимит).
 * После MAX_CLOSE_CYCLES осмысленных закрытий (после открытия) кнопка скрывается навсегда для scopeId.
 */
export default function ServiceHint({ scopeId, label, children, variant = 'compact' }) {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState(() => loadUsage(scopeId))
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    setUsage(loadUsage(scopeId))
  }, [scopeId])

  const showButton = useMemo(() => {
    if (!scopeId) return true
    return !usage.permanent
  }, [scopeId, usage.permanent])

  const closeTimer = useCallback(() => setOpen(false), [])

  const closeUser = useCallback(() => {
    setOpen((prev) => {
      if (prev && scopeId) {
        const all = readAll()
        const cur = all[scopeId] || {}
        const cycles = (typeof cur.cycles === 'number' ? cur.cycles : 0) + 1
        const permanent = cycles >= MAX_CLOSE_CYCLES
        all[scopeId] = { cycles, permanent }
        writeAll(all)
        queueMicrotask(() => setUsage(loadUsage(scopeId)))
      }
      return false
    })
  }, [scopeId])

  useEffect(() => {
    if (!open || !scopeId) return undefined
    const onDoc = (e) => {
      const t = e.target
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      const byIdRoot = document.getElementById(scopeId)
      if (byIdRoot?.contains(t)) return
      closeUser()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') closeUser()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    document.addEventListener('touchstart', onDoc, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open, scopeId, closeUser])

  useEffect(() => {
    if (!open) return undefined
    const t = window.setTimeout(closeTimer, AUTO_CLOSE_MS)
    return () => window.clearTimeout(t)
  }, [open, closeTimer])

  const applyDropdownPlacement = useCallback(() => {
    if (!open) return
    const btn = btnRef.current
    const panel = panelRef.current
    if (!btn || !panel) return
    const next = computeDropdownPlacement(btn, panel)
    if (next) setDropdownStyle(next)
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null)
      return undefined
    }
    applyDropdownPlacement()
    const raf = requestAnimationFrame(() => applyDropdownPlacement())
    window.addEventListener('resize', applyDropdownPlacement)
    window.addEventListener('scroll', applyDropdownPlacement, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', applyDropdownPlacement)
      window.removeEventListener('scroll', applyDropdownPlacement, true)
    }
  }, [open, applyDropdownPlacement, children, variant])

  const onToggle = useCallback(
    (e) => {
      e.stopPropagation()
      if (open) {
        closeUser()
        return
      }
      if (scopeId) {
        const u = loadUsage(scopeId)
        if (u.permanent) return
      }
      setOpen(true)
    },
    [open, scopeId, closeUser],
  )

  const dropdownFixedStyle =
    open && dropdownStyle
      ? {
          position: 'fixed',
          zIndex: 6000,
          top: dropdownStyle.top,
          left: dropdownStyle.left,
          width: dropdownStyle.width,
          maxWidth: dropdownStyle.width,
          margin: 0,
          opacity: 1,
          pointerEvents: 'auto',
        }
      : open
        ? {
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
      className="serviceHint__panel serviceHint__panel--dropdown"
      id={scopeId ? `${scopeId}-panel` : undefined}
      role="region"
      aria-label={label}
      onClick={closeUser}
      style={open ? dropdownFixedStyle : undefined}
    >
      <div className="serviceHint__panelInner">{children}</div>
    </div>
  )

  const btn = showButton ? (
    <button
      ref={btnRef}
      type="button"
      className={`serviceHint__btn${variant === 'compact' ? ' serviceHint__btn--compact' : ''}`.trim()}
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

  const portaled = open && typeof document !== 'undefined' ? createPortal(panelInner, document.body) : null

  return (
    <>
      {btn}
      {portaled}
    </>
  )
}
