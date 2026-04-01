import { Link, Navigate, useParams } from 'react-router-dom'
import { useRepo } from '../useRepo.js'
import { Card, Pill } from '../components.jsx'
import { fmtDateTime, fmtKm } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'

function mask(s, { keepStart = 0, keepEnd = 0 } = {}) {
  const v = String(s || '')
  if (!v) return '—'
  if (v.length <= keepStart + keepEnd) return '—'
  const a = v.slice(0, keepStart)
  const b = v.slice(v.length - keepEnd)
  return `${a}${'•'.repeat(Math.min(12, v.length - keepStart - keepEnd))}${b}`
}

export default function PublicCarPage() {
  const { token } = useParams()
  const r = useRepo()
  const data = r.getCarByShareToken(token)
  if (!data) return <Navigate to="/" replace />

  const { car } = data
  // Публично показываем только личную историю владельца (owner) + скрываем VIN/номер.
  const events = r.listEvents(car.id, { ownerEmail: car.ownerEmail || 'public' }).filter((e) => e.source === 'owner')
  const docs = r.listDocs(car.id, { ownerEmail: car.ownerEmail || 'public' }).filter((d) => d.source === 'owner')
  const recs = getCareRecommendations({ car, events })

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Публичная история</span>
          </div>
          <h1 className="h1">
            {car.make} {car.model}
          </h1>
          <p className="muted">
            {car.city || '—'} • {fmtKm(car.mileageKm)} • {car.year}
          </p>
        </div>
        <Link className="btn" data-variant="ghost" to="/auth">
          Войти в кабинет
        </Link>
      </div>

      <div className="carHero" style={{ backgroundImage: `url(${car.hero})` }}>
        <div className="carHero__overlay">
          <div className="row gap wrap">
            <Pill>VIN: {mask(car.vin, { keepEnd: 4 })}</Pill>
            <Pill>Номер: {mask(car.plate, { keepEnd: 2 })}</Pill>
            {car.seller?.name ? <Pill>Где мылся: {car.seller.name}</Pill> : null}
          </div>
        </div>
      </div>

      <div className="split">
        <Card className="card pad">
          <h2 className="h2">Паспорт</h2>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">VIN</span>
              <span className="kv__v mono">{mask(car.vin, { keepEnd: 4 })}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Госномер</span>
              <span className="kv__v mono">{mask(car.plate, { keepEnd: 2 })}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Пробег</span>
              <span className="kv__v">{fmtKm(car.mileageKm)}</span>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Публично показывается только личная история владельца. VIN и номер скрыты.
          </p>
        </Card>

        <Card className="card pad">
          <h2 className="h2">Рекомендации по уходу</h2>
          <div className="recList">
            {recs.map((x, idx) => (
              <div key={idx} className="recItem">
                <div className="row gap wrap">
                  <span className="pill" data-tone={x.tone || 'neutral'}>
                    {x.tone === 'accent' ? 'важно' : 'совет'}
                  </span>
                  <span className="recTitle">{x.title}</span>
                </div>
                {x.why ? <div className="muted small recWhy">{x.why}</div> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="card pad">
          <h2 className="h2">История обслуживания</h2>
          {events.length ? (
            <div className="miniList">
              {events.map((e) => (
                <div key={e.id} className="miniList__item">
                  <div className="miniList__title">{e.title || 'Визит'}</div>
                  <div className="miniList__meta">
                    {fmtDateTime(e.at)} • {fmtKm(e.mileageKm)}
                  </div>
                  {Array.isArray(e.services) && e.services.length ? (
                    <div className="rowItem__sub">Работы: {e.services.join(', ')}</div>
                  ) : null}
                  {e.note ? <div className="note">{e.note}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">История пуста.</div>
          )}
        </Card>
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="row spread gap">
          <h2 className="h2">Фото / документы</h2>
          <span className="muted small">{docs.length} шт.</span>
        </div>
        {docs.length ? (
          <div className="thumbs thumbs--big">
            {docs.map((d) => (
              <a key={d.id} className="thumb" href={d.url} target="_blank" rel="noreferrer">
                <img alt={d.title} src={d.url} />
              </a>
            ))}
          </div>
        ) : (
          <div className="muted">Нет файлов.</div>
        )}
      </Card>
    </div>
  )
}

