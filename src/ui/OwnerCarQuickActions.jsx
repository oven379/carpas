import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasOwnerSession, isAuthed } from './auth.js'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useDetailing } from './useDetailing.js'
import { getPathAfterCarRemovedFromScope } from './navAfterCarRemoved.js'
import { useAsyncActionLock } from './useAsyncActionLock.js'

/**
 * Действия владельца на карточке авто: «Поделиться историей», «Отвязать от гаража».
 */
export function OwnerCarQuickActions({ carId, car }) {
  const r = useRepo()
  const nav = useNavigate()
  const shareLock = useAsyncActionLock()
  const unlinkLock = useAsyncActionLock()
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
        disabled={unlinkLock.pending}
        title="Убрать авто из вашего гаража КарПас — карточка останется в сети, другой пользователь сможет добавить её к себе"
        onClick={() =>
          void unlinkLock.run(async () => {
            if (
              !confirm(
                'Отвязать автомобиль от вашего гаража?\n\n' +
                  'Карточка и история визитов останутся в КарПас, но вы потеряете доступ как владелец. Другой пользователь сможет привязать этот VIN к своему гаражу.',
              )
            ) {
              return
            }
            try {
              await r.unlinkOwnerCar(carId)
              invalidateRepo()
              alert('Авто отвязано от гаража.')
              const list = await r.listCars()
              nav(getPathAfterCarRemovedFromScope(list, { mode, owner, detailingId }), { replace: true })
            } catch {
              alert('Не удалось отвязать авто (нет доступа к карточке).')
            }
          })
        }
      >
        Отвязать от гаража
      </button>
    </div>
  )
}
