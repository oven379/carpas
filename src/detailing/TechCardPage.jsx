import { Link, Navigate, useParams } from 'react-router-dom'
import { BackNav, Card, PageLoadSpinner } from '../ui/components.jsx'
import { useDetailing } from '../ui/useDetailing.js'
import { getTechCard, reference, techGroups } from './techCards.js'
import './techCards.css'

function groupTitle(id) {
  return techGroups.find((g) => g.id === id)?.title || 'Техкарты'
}

function FieldList({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="techCard__field">
      <div className="techCard__fieldTitle">{title}</div>
      <ul className="techCard__list">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

function Steps({ steps }) {
  if (!steps?.length) return null
  // steps могут быть строками или сгруппированными объектами {group, items}
  const grouped = typeof steps[0] === 'object'
  return (
    <div className="techCard__field">
      <div className="techCard__fieldTitle">Порядок действий</div>
      {grouped ? (
        steps.map((block, i) => (
          <div key={i} className="techCard__stepGroup">
            <div className="techCard__stepGroupName">{block.group}</div>
            <ol className="techCard__steps">
              {block.items.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ol>
          </div>
        ))
      ) : (
        <ol className="techCard__steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ReferenceBody() {
  const { ph, dilution, rules } = reference
  return (
    <div className="techCard__body">
      <div className="techCard__field">
        <div className="techCard__fieldTitle">pH среды</div>
        <p style={{ margin: '0 0 8px' }}>{ph.note}</p>
        <ul className="techCard__list">
          {ph.rows.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
        <p className="techCard__hint">{ph.hint}</p>
      </div>

      <div className="techCard__field">
        <div className="techCard__fieldTitle">{dilution.title}</div>
        <div className="techTableWrap">
          <table className="techTable">
            <thead>
              <tr>{dilution.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {dilution.rows.map((row, i) => (
                <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="techCard__field">
        <div className="techCard__fieldTitle">Правило Вант-Гоффа</div>
        <p style={{ margin: 0 }}>{rules.vantHoff}</p>
      </div>

      <div className="techCard__field">
        <div className="techCard__fieldTitle">{rules.factorsTitle}</div>
        <ul className="techCard__list">
          {rules.factors.map(([name, desc], i) => (
            <li key={i}><strong>{name}:</strong> {desc}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function TechCardPage() {
  const { slug } = useParams()
  const { detailingId, mode, loading } = useDetailing()
  const card = getTechCard(slug)

  if (!loading && (mode !== 'detailing' || !detailingId)) return <Navigate to="/garage" replace />
  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!card) return <Navigate to="/detailing/tech-cards" replace />

  return (
    <div className="container techCard">
      <div className="breadcrumbs">
        <Link to="/detailing">Кабинет</Link>
        <span> / </span>
        <Link to="/detailing/tech-cards">Техкарты</Link>
        <span> / </span>
        <span>{groupTitle(card.group)}</span>
      </div>
      <div className="row gap wrap" style={{ alignItems: 'center' }}>
        <BackNav fallbackTo="/detailing/tech-cards" title="Назад" />
        <h1 className="h1" style={{ margin: 0 }}>{card.title}</h1>
      </div>

      <Card className="card pad techCard__card">
        {card.type === 'reference' ? (
          <ReferenceBody />
        ) : (
          <div className="techCard__body">
            {card.goal ? (
              <div className="techCard__field">
                <div className="techCard__fieldTitle">Цель</div>
                <p style={{ margin: 0 }}>{card.goal}</p>
              </div>
            ) : null}
            <FieldList title="Инструмент" items={card.tools} />
            <FieldList title="Химия" items={card.chemistry} />
            <Steps steps={card.steps} />
            <FieldList title="Когда применяется" items={card.when} />
            <FieldList title="Контроль результата" items={card.control} />
          </div>
        )}
      </Card>
    </div>
  )
}
