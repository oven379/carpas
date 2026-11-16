import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LandingAuthDialog } from './LandingAuthDialog.jsx'

export function LandingAuthLink({ mode = 'login', className, onOpen, children }: {
  mode?: 'login' | 'register'
  className: string
  onOpen?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLAnchorElement>(null)

  return (
    <>
      <Link
        ref={triggerRef}
        to={mode === 'register' ? '/auth/owner?register=1' : '/auth'}
        className={className}
        aria-haspopup="dialog"
        onClick={event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onOpen?.()
          setOpen(true)
        }}
      >
        {children}
      </Link>
      {open && (
        <LandingAuthDialog
          initialMode={mode}
          onClose={() => {
            setOpen(false)
            triggerRef.current?.focus({ preventScroll: true })
          }}
        />
      )}
    </>
  )
}
