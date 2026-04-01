import { useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { isAuthed } from './auth.js'
import { getPathAfterCarRemovedFromScope } from './navAfterCarRemoved.js'

/**
 * «Поддержка» с выпадающим меню — только в шапке для владельца (личный гараж).
 */
export default function OwnerSupportDropdown() {
  const r = useRepo()
  const nav = useNavigate()
  const { detailingId, owner, mode } = useDetailing()
  const match = useMatch({ path: '/car/:id', end: true })
  const carId = match?.params?.id
  const scope = { ownerEmail: owner?.email }
  const car =
    carId && isAuthed() && mode === 'owner' ? r.getCar(carId, scope) : null
  const shares = carId && r.listShares ? r.listShares(carId) : []
  const activeShare = shares.find((s) => !s.revokedAt) || null

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const supportTextGeneric =
    'Поддержка (MVP)\n\n' +
    `Страница: ${location.href}\n` +
    `Браузер: ${navigator.userAgent}\n\n` +
    'Опишите проблему и отправьте это сообщение в поддержку.'

  async function copySupport(text) {
    setOpen(false)
    try {
      await navigator.clipboard.writeText(text)
      alert('Текст для поддержки скопирован. Вставьте его в сообщение.')
    } catch {
      prompt('Скопируйте текст для поддержки', text)
    }
  }

  return (
    <div className="navSupportDd" ref={ref}>
      <button
        type="button"
        className="nav__action navSupportDd__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        Поддержка
        <span className="navSupportDd__chev" aria-hidden="true" />
      </button>
      {open ? (
        <div className="navSupportDd__menu" role="menu">
          {car ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="footerHelpDd__item"
                onClick={async () => {
                  setOpen(false)
                  const share = activeShare || (await r.createShare(carId))
                  invalidateRepo()
                  const url = `${location.origin}/share/${share.token}`
                  try {
                    await navigator.clipboard.writeText(url)
                    alert('Ссылка скопирована')
                  } catch {
                    prompt('Скопируй ссылку', url)
                  }
                }}
              >
                Поделиться историей
              </button>
              <button
                type="button"
                role="menuitem"
                className="footerHelpDd__item"
                onClick={() => {
                  setOpen(false)
                  const nextEmail = prompt('Введите почту нового владельца', '')
                  const em = String(nextEmail || '').trim().toLowerCase()
                  if (!em) return
                  const msg =
                    'Передать авто другому владельцу?\n\n' +
                    `Новый владелец: ${em}\n\n` +
                    'После передачи это авто исчезнет из вашего гаража.'
                  if (!confirm(msg)) return
                  const ok = r.updateCar(carId, { ownerEmail: em }, { ownerEmail: owner?.email })
                  if (!ok) {
                    alert('Не удалось передать авто (нет доступа к карточке).')
                    return
                  }
                  invalidateRepo()
                  alert('Авто передано новому владельцу.')
                  nav(getPathAfterCarRemovedFromScope(r, { mode, owner, detailingId }), { replace: true })
                }}
              >
                Передать авто
              </button>
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="footerHelpDd__item"
            onClick={() => {
              void copySupport(
                car
                  ? 'Поддержка (MVP)\n\n' +
                      `Авто: ${car.make} ${car.model} · VIN: ${car.vin || '—'}\n` +
                      `Страница: ${location.href}\n` +
                      `Браузер: ${navigator.userAgent}\n\n` +
                      'Опишите проблему и отправьте это сообщение в поддержку.'
                  : supportTextGeneric,
              )
            }}
          >
            Написать в поддержку
          </button>
        </div>
      ) : null}
    </div>
  )
}
