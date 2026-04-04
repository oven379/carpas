import { useState } from 'react'
import { useRepo, invalidateRepo } from './useRepo.js'
import { Card, Input, ServiceHint } from './components.jsx'
import { fmtKm, normDigits, normVin } from '../lib/format.js'
import { OWNER_MAX_TOTAL_CARS, ownerGarageLimits } from '../lib/garageLimits.js'

/**
 * Поиск авто по VIN среди карточек сервисов и заявка на привязку к гаражу владельца.
 */
export default function OwnerVinClaimSection({ ownerEmail, sectionId = 'owner-vin-claim', className = '', style }) {
  const r = useRepo()
  const [vin, setVin] = useState('')
  const [vinResults, setVinResults] = useState([])
  const [evidenceByCarId, setEvidenceByCarId] = useState({})

  const ownerCars = r.listCars({ ownerEmail })
  const { canVinClaim, totalCount } = ownerGarageLimits(ownerCars)
  const ownerClaims = r.listClaimsForOwner(ownerEmail)
  const pendingClaims = ownerClaims.filter((x) => x.status === 'pending')

  return (
    <Card id={sectionId} className={`card pad ${className}`.trim()} style={style}>
      <div className="row gap wrap" style={{ alignItems: 'center' }}>
        <div className="cardTitle" style={{ margin: 0 }}>
          Найти авто по VIN
        </div>
        <ServiceHint
          scopeId={`owner-vin-claim-hint-${sectionId}`}
          variant="compact"
          label="Справка: найти авто по VIN"
        >
          <p className="serviceHint__panelText">
            Если детейлинг уже вёл карточку, укажите VIN и подтвердите год и цвет — заявка уйдёт на проверку. После
            одобрения машина появится в вашем гараже: вы сможете вести свою историю и документы; редактировать саму
            карточку (марка, VIN, обложка и т.д.) можно только в сервисе.
          </p>
        </ServiceHint>
      </div>
      {!canVinClaim ? (
        <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
          В гараже уже {totalCount} из {OWNER_MAX_TOTAL_CARS} автомобилей — поиск авто по VIN недоступен.
        </p>
      ) : null}
      <div className="row gap marketVinRow" style={{ marginTop: 10 }}>
        <Input
          className="input mono marketVinRow__input"
          placeholder="VIN…"
          value={vin}
          maxLength={17}
          disabled={!canVinClaim}
          onChange={(e) => setVin(normVin(e.target.value))}
        />
        <button
          className="btn marketVinRow__btn"
          data-variant="primary"
          type="button"
          disabled={!canVinClaim}
          onClick={() => {
            const v = normVin(vin)
            setVin(v)
            const res = r.findCarsByVin(v)
            setVinResults(res)
            if (!res.length) alert('В сервисе пока нет авто с таким VIN.')
          }}
        >
          Найти
        </button>
      </div>

      {pendingClaims.length ? (
        <div className="topBorder">
          <div className="muted small">Заявки на модерации: {pendingClaims.length}</div>
        </div>
      ) : null}

      {vinResults.length ? (
        <div className="topBorder">
          <div className="muted small" style={{ marginBottom: 10 }}>
            Найдено: {vinResults.length}
          </div>
          <div className="list">
            {vinResults.slice(0, 5).map((c) => {
              const alreadyMine = (c.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
              const ev = evidenceByCarId[c.id] || { year: '', color: '' }
              return (
                <Card key={c.id} className="card pad">
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    Подтвердите год и цвет — детейлинг сверит с карточкой (марка и модель уже указаны выше).
                  </div>
                  <div className="row spread gap">
                    <div>
                      <div className="rowItem__title">
                        {c.make} {c.model}
                      </div>
                      <div className="rowItem__meta">
                        {fmtKm(c.mileageKm)} · {c.city || '—'} · сервис: {c.seller?.name || '—'}
                      </div>
                    </div>
                    <button
                      className="btn"
                      data-variant="primary"
                      type="button"
                      disabled={alreadyMine || !canVinClaim}
                      onClick={() => {
                        const claim = r.createClaim({ carId: c.id, ownerEmail, evidence: ev })
                        if (claim?.error === 'already_pending') {
                          alert('Заявка уже отправлена и ждёт подтверждения.')
                          return
                        }
                        if (claim?.error === 'garage_full') {
                          alert(`В гараже уже максимум ${OWNER_MAX_TOTAL_CARS} автомобилей.`)
                          return
                        }
                        if (claim?.error) {
                          alert('Не удалось отправить заявку.')
                          return
                        }
                        invalidateRepo()
                        alert('Заявка отправлена в детейлинг на подтверждение.')
                      }}
                    >
                      {alreadyMine ? 'Уже в гараже' : 'Отправить заявку'}
                    </button>
                  </div>

                  <div className="formGrid" style={{ marginTop: 10 }}>
                    <div className="field">
                      <div className="field__top">
                        <span className="field__label">Год</span>
                      </div>
                      <Input
                        className="input"
                        inputMode="numeric"
                        value={ev.year}
                        onChange={(e) =>
                          setEvidenceByCarId((m) => ({
                            ...m,
                            [c.id]: { ...ev, year: normDigits(e.target.value, { max: 2100, maxLen: 4 }) },
                          }))
                        }
                        placeholder="Например: 2019"
                      />
                    </div>
                    <div className="field">
                      <div className="field__top">
                        <span className="field__label">Цвет</span>
                      </div>
                      <Input
                        className="input"
                        value={ev.color}
                        onChange={(e) =>
                          setEvidenceByCarId((m) => ({ ...m, [c.id]: { ...ev, color: e.target.value } }))
                        }
                        placeholder="Например: Чёрный"
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
