import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasOwnerSession, isAuthed } from './auth.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { getPathAfterCarRemovedFromScope } from './navAfterCarRemoved.js'
import { useAsyncActionLock } from './useAsyncActionLock.js'

/**
 * Действия владельца на карточке авто (раньше были в выпадающем меню «Поддержка»).
 */
export function OwnerCarQuickActions({ carId, car }) {
  const r = useRepo()
  const nav = useNavigate()
  const shareLock = useAsyncActionLock()
  const transferLock = useAsyncActionLock()
  const { detailingId, owner, mode } = useDetailing()
  const [shares, setShares] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!carId || !isAuthed() || !hasOwnerSession()) {
        setShares([])
        return
      }
      try {
        const sh = await r.listShares(carId)
        if (!cancelled) setShares(Array.isArray(sh) ? sh : [])
      } catch {
        if (!cancelled) setShares([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [carId, mode, r, r._version])

  if (!hasOwnerSession() || mode !== 'owner' || !carId || !car) return null

  const activeShare = shares.find((s) => !s.revokedAt) || null

  return (
    <div className="heroActions heroActions--ownerExtra row gap wrap" aria-label="Действия с автомобилем">
      <button
        type="button"
        className="btn carHero__ownerActionBtn"
        data-variant="ghost"
        disabled={shareLock.pending}
        title="Скопировать ссылку на историю"
        onClick={() =>
          void shareLock.run(async () => {
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
        className="btn carHero__ownerActionBtn"
        data-variant="ghost"
        disabled={transferLock.pending}
        title="Передать авто другому владельцу"
        onClick={() =>
          void transferLock.run(async () => {
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
    </div>
  )
}
