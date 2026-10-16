import { Link, Navigate } from 'react-router-dom'
import { BackNav, Card, PageLoadSpinner } from '../ui/components.jsx'
import { useDetailing } from '../ui/useDetailing.js'
import { TECH_BRAND, techGroups, techPhilosophy, techCardsByGroup } from './techCards.js'
import './techCards.css'

export default function TechCardsPage() {
  const { detailingId, mode, loading } = useDetailing()

  if (!loading && (mode !== 'detailing' || !detailingId)) return <Navigate to="/garage" replace />
  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  return (
    <div className="container techHub">
      <div className="breadcrumbs">
        <Link to="/detailing">Кабинет</Link>
        <span> / </span>
        <span>Техкарты</span>
      </div>
      <div className="row gap wrap" style={{ alignItems: 'center' }}>
        <BackNav fallbackTo="/detailing" title="Назад" />
        <h1 className="h1" style={{ margin: 0 }}>
          Техкарты детейлинга
        </h1>
      </div>

      <Card className="card pad techHub__intro">
        <p style={{ margin: 0 }}>{techPhilosophy}</p>
        <p className="muted small" style={{ margin: '10px 0 0' }}>
          Внутренняя база знаний {TECH_BRAND}: атомарные техкарты процессов. Раздел доступен только партнёрам.
        </p>
      </Card>

      {techGroups.map((group) => {
        const cards = techCardsByGroup(group.id)
        if (!cards.length) return null
        return (
          <section key={group.id} className="techHub__group">
            <div className="techHub__groupHead">
              <h2 className="h2" style={{ margin: 0 }}>{group.title}</h2>
              {group.intro ? <p className="muted small" style={{ margin: '2px 0 0' }}>{group.intro}</p> : null}
            </div>
            <div className="techHub__grid">
              {cards.map((card) => (
                <Link key={card.slug} to={`/detailing/tech-cards/${card.slug}`} className="techCardTile">
                  <span className="techCardTile__title">{card.title}</span>
                  <span className="techCardTile__summary">{card.summary}</span>
                  {card.chemistry?.length ? (
                    <span className="techCardTile__chem">{card.chemistry.slice(0, 3).join(' · ')}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
