import { useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { bumpSessionRefresh, hasOwnerSession, isAuthed } from './auth.js'
import { getPathAfterCarRemovedFromScope } from './navAfterCarRemoved.js'
import { useAsyncActionLock } from './useAsyncActionLock.js'
import { useSupport } from './support/useSupport.js'

/**
 * «Поддержка» с выпадающим меню для владельца (шапка или футер).
 * `placement="footer"` — меню открывается вверх, стиль как у ссылок в футере.
 */
export default function OwnerSupportDropdown({ placement = 'nav' }) {
  const { openModal, unreadCount } = useSupport()
  const r = useRepo()
  const nav = useNavigate()
  const shareLock = useAsyncActionLock()
  const transferLock = useAsyncActionLock()
  const premiumLock = useAsyncActionLock()
  const { detailingId, owner, mode } = useDetailing()
  const match = useMatch({ path: '/car/:id', end: true })
  const carId = match?.params?.id
  const [car, setCar] = useState(null)
  const [shares, setShares] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!carId || !isAuthed() || !hasOwnerSession()) {
        setCar(null)
        setShares([])
        return
      }
      try {
        const [cr, sh] = await Promise.all([r.getCar(carId), r.listShares(carId)])
        if (cancelled) return
        setCar(cr)
        setShares(Array.isArray(sh) ? sh : [])
      } catch {
        if (!cancelled) {
          setCar(null)
          setShares([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [carId, mode, r, r._version])
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
        <span className="ownerSupportDd__triggerInner">
          <span className="ownerSupportDd__triggerLabel">Поддержка</span>
          {unreadCount > 0 ? (
            <span
              className="supportUnreadBadge supportUnreadBadge--inMenu"
              title="Есть ответ поддержки"
              aria-label={`Непрочитанных ответов: ${unreadCount}`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </span>
        <span className={chevClass} aria-hidden="true" />
      </button>
      {open ? (
        <div className={menuClass} role="menu">
          {unreadCount > 0 ? (
            <button
              type="button"
              role="menuitem"
              className="footerHelpDd__item footerHelpDd__item--accentHint"
              onClick={() => {
                setOpen(false)
                openModal()
              }}
            >
              Ответ поддержки{unreadCount > 1 ? ` (${unreadCount})` : ''}
            </button>
          ) : null}
          {car ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="footerHelpDd__item"
                disabled={shareLock.pending}
                onClick={() =>
                  void shareLock.run(async () => {
                    setOpen(false)
                    const share = activeShare || (await r.createShare(carId))
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
                  })
                }
              >
                Поделиться историей
              </button>
              <button
                type="button"
                role="menuitem"
                className="footerHelpDd__item"
                disabled={transferLock.pending}
                onClick={() =>
                  void transferLock.run(async () => {
                    setOpen(false)
                    const nextEmail = prompt('Введите почту нового владельца', '')
                    const em = String(nextEmail || '').trim().toLowerCase()
                    if (!em) return
                    const msg =
                      'Передать авто другому владельцу?\n\n' +
                      `Новый владелец: ${em}\n\n` +
                      'После передачи это авто исчезнет из вашего гаража.'
                    if (!confirm(msg)) return
                    try {
                      await r.updateCar(carId, { ownerEmail: em })
                      invalidateRepo()
                      alert('Авто передано новому владельцу.')
                      const list = await r.listCars()
                      nav(getPathAfterCarRemovedFromScope(list, { mode, owner, detailingId }), { replace: true })
                    } catch {
                      alert('Не удалось передать авто (нет доступа к карточке).')
                    }
                  })
                }
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
              setOpen(false)
              openModal({
                carId: carId || undefined,
                bodyPrefix: car
                  ? `Авто: ${car.make} ${car.model} · VIN: ${car.vin || '—'}\n\n`
                  : '',
              })
            }}
          >
            Написать в поддержку
          </button>
          <button
            type="button"
            role="menuitem"
            className="footerHelpDd__item"
            disabled={premiumLock.pending}
            onClick={() =>
              void premiumLock.run(async () => {
                setOpen(false)
                if (!owner?.email || !r.updateOwnerMe) {
                  alert('Не удалось обновить тариф.')
                  return
                }
                try {
                  const next = await r.updateOwnerMe({ isPremium: !owner.isPremium })
                  invalidateRepo()
                  bumpSessionRefresh()
                  const prem = Boolean(next?.owner?.isPremium)
                  alert(prem ? 'Premium включён.' : 'Premium выключен.')
                } catch {
                  alert('Не удалось обновить тариф.')
                }
              })
            }
          >
            {owner?.isPremium ? 'Отключить Premium' : 'Подключить Premium'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
