import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useRepo } from '../useRepo.js'
import { BackNav, Card } from '../components.jsx'
import { fmtDateTime, fmtKm, fmtPlateFull } from '../../lib/format.js'
import { getCareRecommendations } from '../../lib/recommendations.js'
import { splitWashDetailingServices } from '../../lib/serviceCatalogs.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'

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
  const [photoLb, setPhotoLb] = useState(null)
  const data = r.getCarByShareToken(token)
  const car = data?.car ?? null

  const events = useMemo(() => {
    if (!car) return []
    return r.listEvents(car.id, { ownerEmail: car.ownerEmail || 'public' }).filter((e) => e.source === 'owner')
  }, [car, r])

  const docs = useMemo(() => {
    if (!car) return []
    return r.listDocs(car.id, { ownerEmail: car.ownerEmail || 'public' }).filter((d) => d.source === 'owner')
  }, [car, r])

  const docGalleryItems = useMemo(() => docsToPhotoItems(docs), [docs])

  const recs = useMemo(() => {
    if (!car) return []
    return getCareRecommendations({ car, events })
  }, [car, events])

  if (!data) return <Navigate to="/" replace />

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Публичная история</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/auth" title="Назад" />
            <h1 className="h1" style={{ margin: 0 }}>
              {car.make} {car.model}
            </h1>
          </div>
          <p className="muted">
            {car.city || '—'} · {fmtKm(car.mileageKm)} · {car.year}
          </p>
        </div>
        <Link className="btn" data-variant="ghost" to="/auth">
          Войти в кабинет
        </Link>
      </div>

      <div className="carHero" style={{ backgroundImage: `url(${car.hero})` }}>
        <div className="carHero__overlay" aria-hidden="true" />
      </div>

      <div className="split">
        <Card className="card pad">
          <h2 className="h2">Данные автомобиля</h2>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__k">VIN</span>
              <span className="kv__v mono">{mask(car.vin, { keepEnd: 4 })}</span>
            </div>
            <div className="kv__row">
              <span className="kv__k">Госномер</span>
              <span className="kv__v mono">{mask(fmtPlateFull(car.plate, car.plateRegion), { keepEnd: 2 })}</span>
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
          <h2 className="h2">Рекомендации по уходу за автомобилем</h2>
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
          <h2 className="h2">История обслуживания автомобиля</h2>
          {events.length ? (
            <div className="miniList">
              {events.map((e) => (
                <div key={e.id} className="miniList__item">
                  <div className="miniList__title">{e.title || 'Визит'}</div>
                  <div className="miniList__meta">
                    <span className="eventMeta__when">{fmtDateTime(e.at)}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="eventMeta__km">{fmtKm(e.mileageKm)}</span>
                  </div>
                  {Array.isArray(e.maintenanceServices) && e.maintenanceServices.length ? (
                    <div className="rowItem__sub">
                      <span className="eventLabel">ТО:</span> {e.maintenanceServices.join(', ')}
                    </div>
                  ) : null}
                  {(() => {
                    const { wash, other } = splitWashDetailingServices(e.services)
                    return (
                      <>
                        {wash.length ? (
                          <div className="rowItem__sub">
                            <span className="eventLabel">Уход:</span> {wash.join(', ')}
                          </div>
                        ) : null}
                        {other.length ? (
                          <div className="rowItem__sub">
                            <span className="eventLabel">Детейлинг:</span> {other.join(', ')}
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
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
          <h2 className="h2">Фото и документы автомобиля</h2>
          <span className="muted small">{docs.length} шт.</span>
        </div>
        {docs.length ? (
          <div className="thumbs thumbs--big">
            {docs.map((d) => {
              const gi = docGalleryItems.findIndex((g) => g.id === d.id)
              return gi >= 0 ? (
                <button
                  key={d.id}
                  type="button"
                  className="thumb thumb--lb"
                  aria-label={d.title ? `Открыть фото: ${d.title}` : 'Открыть фото'}
                  onClick={() =>
                    setPhotoLb({
                      items: docGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                      startIndex: gi,
                    })
                  }
                >
                  <img alt={d.title} src={d.url} />
                </button>
              ) : (
                <a key={d.id} className="thumb" href={d.url} target="_blank" rel="noreferrer">
                  <img alt={d.title} src={d.url} />
                </a>
              )
            })}
          </div>
        ) : (
          <div className="muted">Нет файлов.</div>
        )}
      </Card>
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}

