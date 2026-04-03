import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SWIPE_PX = 48

/**
 * Полноэкранный просмотр фото: тап по кадру — следующее; свайп; тап по краям; клавиши; колесо. Только кнопка «Закрыть».
 * @param {{ open: boolean, items: { url: string, title?: string }[], startIndex?: number, onClose: () => void }} props
 */
export function PhotoLightbox({ open, items, startIndex = 0, onClose }) {
  const list = Array.isArray(items) ? items.filter((x) => x && String(x.url || '').trim()) : []
  const [index, setIndex] = useState(0)
  const closeRef = useRef(null)
  const stageRef = useRef(null)
  const pointerStartX = useRef(null)
  const pointerActive = useRef(false)

  useEffect(() => {
    if (!open) return
    const max = Math.max(0, list.length - 1)
    const i = Number(startIndex)
    const next = Number.isFinite(i) ? Math.min(Math.max(0, i), max) : 0
    setIndex(next)
  }, [open, startIndex, items, list.length])

  const go = useCallback(
    (delta) => {
      if (list.length <= 1) return
      setIndex((i) => {
        const n = list.length
        return (i + delta + n) % n
      })
    },
    [list.length],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || list.length <= 1) return
    const el = stageRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      const dx = e.deltaX
      const dy = e.deltaY
      const horiz = Math.abs(dx) > Math.abs(dy) ? dx : e.shiftKey ? dy : 0
      if (horiz === 0) return
      e.preventDefault()
      if (horiz > 0) go(1)
      else go(-1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [open, list.length, go])

  if (!open || list.length === 0) return null

  const cur = list[index]
  const label = cur.title || 'Фото'
  const showNav = list.length > 1

  const onBackdropPointerDown = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button')) return
    pointerActive.current = true
    pointerStartX.current = e.clientX
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerUp = (e) => {
    if (!pointerActive.current) return
    pointerActive.current = false
    const x0 = pointerStartX.current
    pointerStartX.current = null
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore */
    }
    if (x0 == null || list.length <= 1) return
    const dx = e.clientX - x0
    if (dx > SWIPE_PX) go(-1)
    else if (dx < -SWIPE_PX) go(1)
    else go(1)
  }

  const onPointerCancel = (e) => {
    pointerActive.current = false
    pointerStartX.current = null
    try {
      if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore */
    }
  }

  const node = (
    <div
      className="photoLightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографии"
      onMouseDown={onBackdropPointerDown}
    >
      <div className="photoLightbox__inner" onMouseDown={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          className="photoLightbox__close btn"
          data-variant="ghost"
          aria-label="Закрыть"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ×
        </button>
        <div
          ref={stageRef}
          className="photoLightbox__stage"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {showNav ? (
            <>
              <button
                type="button"
                className="photoLightbox__tapZone photoLightbox__tapZone--prev"
                aria-label="Предыдущее фото"
                onClick={(e) => {
                  e.stopPropagation()
                  go(-1)
                }}
              />
              <button
                type="button"
                className="photoLightbox__tapZone photoLightbox__tapZone--next"
                aria-label="Следующее фото"
                onClick={(e) => {
                  e.stopPropagation()
                  go(1)
                }}
              />
            </>
          ) : null}
          <img className="photoLightbox__img" src={cur.url} alt={label} draggable={false} />
        </div>
        <div className="photoLightbox__caption" onMouseDown={(e) => e.stopPropagation()}>
          {showNav ? (
            <span className="photoLightbox__counter muted small">
              {index + 1} / {list.length}
            </span>
          ) : null}
          <div className="photoLightbox__title">{label}</div>
          <a
            className="photoLightbox__openTab link"
            href={cur.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Открыть в новой вкладке
          </a>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
