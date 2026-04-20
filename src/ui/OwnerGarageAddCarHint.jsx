import { Link } from 'react-router-dom'
import { Card } from './components.jsx'
import { SupportButton } from './support/SupportHub.jsx'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../lib/supportTicketPresets.js'
import { OWNER_MAX_FREE_GARAGE_CARS } from '../lib/garageLimits.js'

/**
 * Блок в гараже владельца: только ручное добавление авто (без поиска по VIN).
 */
export default function OwnerGarageAddCarHint({
  className = '',
  style,
  canAddManual,
  fromPath = '/garage',
  pendingClaimsCount = 0,
}) {
  const from = String(fromPath || '/garage') || '/garage'
  const createHref = `/create?from=${encodeURIComponent(from)}`

  return (
    <Card className={`card pad ${className}`.trim()} style={style}>
      <div className="cardTitle" style={{ margin: '0 0 8px' }}>
        Добавить автомобиль
      </div>
      <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.55, maxWidth: '64ch' }}>
        Заведите карточку вручную: марка, модель, при желании VIN и госномер. История визитов из кабинетов партнёров по совпадению
        VIN подтянется в эту карточку, когда вы укажете тот же номер.
      </p>
      <div className="row gap wrap" style={{ alignItems: 'center' }}>
        {canAddManual ? (
          <Link className="btn" data-variant="primary" to={createHref}>
            Заполнить данные авто
          </Link>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0, maxWidth: '56ch' }}>
              В бесплатном гараже — не больше {OWNER_MAX_FREE_GARAGE_CARS} автомобилей. Чтобы добавить ещё одно, оформите Premium.
            </p>
            <SupportButton className="btn" data-variant="primary" openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}>
              Заявка на Premium
            </SupportButton>
          </>
        )}
      </div>
      {pendingClaimsCount > 0 ? (
        <p className="muted small topBorder" style={{ marginTop: 12, paddingTop: 12, marginBottom: 0 }}>
          Заявок на модерации: {pendingClaimsCount}.{' '}
          <Link to="/requests">Открыть раздел заявок</Link>
        </p>
      ) : null}
    </Card>
  )
}
