import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { isAuthed } from './auth.js'
import { getPathAfterCarRemovedFromScope } from './navAfterCarRemoved.js'

/**
 * «Поддержка» с выпадающим меню для владельца (шапка или футер).
 * `placement="footer"` — меню открывается вверх, стиль как у ссылок в футере.
 */
export default function OwnerSupportDropdown({ placement = 'nav' }) {
  const r = useRepo()
  const nav = useNavigate()
  const loc = useLocation()
  const { detailingId, owner, mode } = useDetailing()
  const carId = useMemo(() => {
    const m = /^\/car\/([^/]+)/.exec(loc.pathname)
    return m ? m[1] : undefined
  }, [loc.pathname])
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
    'Поддержка КарПас\n\n' +
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

  const isFooter = placement === 'footer'
  const rootClass = isFooter ? 'footerHelpDd' : 'navSupportDd'
  const menuClass = isFooter ? 'footerHelpDd__menu' : 'navSupportDd__menu'
  const triggerClass = isFooter
    ? 'btn footerHelpDd__link footerHelpDd__trigger ownerSupportDd__footerBtn'
    : 'nav__action navSupportDd__trigger'
  const chevClass = isFooter ? 'footerHelpDd__chev' : 'navSupportDd__chev'

  return (
    <div className={rootClass} ref={ref}>
      <button
        type="button"
        className={triggerClass}
        data-variant={isFooter ? 'outline' : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        Поддержка
        <span className={chevClass} aria-hidden="true" />
      </button>
      {open ? (
        <div className={menuClass} role="menu">
          {car ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="footerHelpDd__item"
                onClick={async () => {
                  setOpen(false)
                  const share = activeShare || (await r.createShare(carId, { ownerEmail: owner?.email }))
                  if (!share) {
                    alert('Не удалось создать ссылку (нет доступа к авто).')
                    return
                  }
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
                  ? 'Поддержка КарПас\n\n' +
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
          <button
            type="button"
            role="menuitem"
            className="footerHelpDd__item"
            onClick={() => {
              setOpen(false)
              if (!owner?.email || !r.updateOwner) {
                alert('Не удалось обновить тариф.')
                return
              }
              const next = r.updateOwner(owner.email, { isPremium: !owner.isPremium })
              if (!next) {
                alert('Не удалось обновить тариф.')
                return
              }
              invalidateRepo()
              alert(next.isPremium ? 'Premium включён.' : 'Premium выключен.')
            }}
          >
            {owner?.isPremium ? 'Отключить Premium' : 'Подключить Premium'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
