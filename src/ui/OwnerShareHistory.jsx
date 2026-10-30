import { useCallback, useEffect, useState } from 'react'
import { Card } from './components.jsx'
import { useRepo, invalidateRepo } from './useRepo.js'
import { useAsyncActionLock } from './useAsyncActionLock.js'
import { showToast } from './toast.jsx'
import { absoluteUrl } from '../lib/siteOrigin.js'
import { shareEligibilityHint } from '../lib/shareEligibility.js'

/**
 * Карточка авто у владельца: публичная ссылка на историю для покупателя.
 * Доступность определяет бэкенд (6 своих визитов или 3 месяца ведения истории).
 */
export function OwnerShareHistory({ carId }) {
  const r = useRepo()
  const lock = useAsyncActionLock()
  const [state, setState] = useState({ loading: true, eligibility: null, share: null })

  const load = useCallback(async () => {
    try {
      const [eligibility, shares] = await Promise.all([r.getShareEligibility(carId), r.listShares(carId)])
      const share = Array.isArray(shares) ? shares.find((s) => !s.revokedAt) || null : null
      setState({ loading: false, eligibility, share })
    } catch {
      setState({ loading: false, eligibility: null, share: null })
    }
  }, [r, carId])

  useEffect(() => {
    if (carId) void load()
  }, [carId, load])

  if (state.loading || !state.eligibility) return null

  const { eligibility, share } = state
  const url = share ? absoluteUrl(`/share/${share.token}`) : ''

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Ссылка скопирована', 'success')
    } catch {
      window.prompt('Скопируйте ссылку', text)
    }
  }

  function onShare() {
    void lock.run(async () => {
      try {
        const next = share || (await r.createShare(carId))
        invalidateRepo()
        setState((s) => ({ ...s, share: next }))
        await copy(absoluteUrl(`/share/${next.token}`))
      } catch {
        showToast('Не удалось создать ссылку. Попробуйте ещё раз.')
      }
    })
  }

  function onRevoke() {
    void lock.run(async () => {
      try {
        await r.revokeShare(share.token)
        invalidateRepo()
        setState((s) => ({ ...s, share: null }))
        showToast('Ссылка отключена', 'success')
      } catch {
        showToast('Не удалось отключить ссылку. Попробуйте ещё раз.')
      }
    })
  }

  return (
    <Card className="card pad">
      <h2 className="h2 carPage__sectionTitle carPage__sectionTitle--solo">Поделиться историей:</h2>
      {eligibility.eligible ? (
        <>
          <p className="muted small" style={{ margin: '8px 0 12px' }}>
            Ссылка открывает покупателю вашу историю: даты, пробег, работы и фото. VIN, госномер и контакты не
            показываются. Отключить ссылку можно в любой момент.
          </p>
          <div className="row gap wrap">
            <button type="button" className="btn" data-variant="primary" disabled={lock.pending} onClick={onShare}>
              {share ? 'Скопировать ссылку' : 'Создать и скопировать ссылку'}
            </button>
            {share ? (
              <button type="button" className="btn" data-variant="ghost" disabled={lock.pending} onClick={onRevoke}>
                Отключить ссылку
              </button>
            ) : null}
          </div>
          {share ? (
            <p className="muted small mono" style={{ margin: '10px 0 0', wordBreak: 'break-all' }}>
              {url}
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted small" style={{ margin: '8px 0 0' }}>
          {shareEligibilityHint(eligibility)}
        </p>
      )}
    </Card>
  )
}
