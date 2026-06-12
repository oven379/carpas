import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastCtx = createContext(null)

let _show = null
/** Показать тост из любого места без хука (fallback для не-React кода). */
export function showToast(message, type = 'error') {
  if (_show) _show(message, type)
  else console.warn('[toast]', type, message)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback((message, type = 'error') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message: String(message || ''), type }])
    const ms = type === 'error' ? 6000 : 4000
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    _show = show
    return () => { if (_show === show) _show = null }
  }, [show])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(<Toaster toasts={toasts} onDismiss={dismiss} />, document.body)
        : null}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx) ?? showToast
}

const TYPE_STYLES = {
  error: {
    accent: 'rgba(210,70,60,0.85)',
  },
  warn: {
    accent: 'rgba(190,145,60,0.90)',
  },
  info: {
    accent: 'var(--accent)',
  },
  success: {
    accent: 'rgba(70,170,90,0.85)',
  },
}

function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'center',
      pointerEvents: 'none',
      width: 'min(480px, calc(100vw - 32px))',
    }}>
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] ?? TYPE_STYLES.error
        return (
          <div
            key={t.id}
            style={{
              width: '100%',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-strong)',
              borderLeft: `3px solid ${s.accent}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              fontSize: '0.9em',
              lineHeight: 1.4,
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0 0 0 4px',
                fontSize: '1.1em',
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
