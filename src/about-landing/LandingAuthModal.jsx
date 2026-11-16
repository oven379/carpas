import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import Logo from '../ui/Logo.jsx'
import './LandingAuthDialog.css'

export function LandingAuthModal({ title, description, initialFocusRef, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus({ preventScroll: true })
    dialog.scrollTop = 0
  }, [initialFocusRef, title])

  return (
    <dialog
      ref={dialogRef}
      className="landingAuthDialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current.close()
      }}
    >
      <div className="landingAuthDialog__bar">
        <Logo size={22} tagline={false} />
        <button className="landingAuthDialog__close" type="button" aria-label="Закрыть окно" onClick={() => dialogRef.current.close()}>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="landingAuthDialog__body">
        <h2 id={titleId}>{title}</h2>
        <p className="landingAuthDialog__description" id={descriptionId}>{description}</p>
        {children}
      </div>
    </dialog>
  )
}
