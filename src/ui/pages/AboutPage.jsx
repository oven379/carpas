import { Link } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd } from '../../seo/marketingJsonLd.js'

export default function AboutPage() {
  const description =
    'КарПас — российский сервис истории автомобиля и CRM для детейлинга, СТО и автосервисов. История авто, документы, фото и визиты в одном месте.'
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Главная', path: '/' },
    { name: 'О сервисе', path: '/about' },
  ])

  return (
    <main className="container infoPage">
      <Seo title="О сервисе КарПас" description={description} canonicalPath="/about" jsonLd={jsonLd} />
      <section className="infoHero">
        <p className="muted small">О проекте</p>
        <h1 className="h1">КарПас — история автомобиля и сервисная CRM</h1>
        <p className="infoHero__lead">
          Мы создаем единую цифровую историю авто: для владельцев это личный гараж в телефоне, для детейлингов и СТО —
          удобная CRM с визитами, фотоотчетами и напоминаниями.
        </p>
        <div className="row gap wrap">
          <Link className="btn" data-variant="primary" to="/owners">
            Владельцам авто
          </Link>
          <Link className="btn" data-variant="outline" to="/business">
            Детейлингу и СТО
          </Link>
        </div>
      </section>
    </main>
  )
}
