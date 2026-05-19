import { Link } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildSoftwareJsonLd } from '../../seo/marketingJsonLd.js'

const title = 'CRM для детейлинга и СТО — КарПас'
const description =
  'КарПас — CRM для детейлинга, СТО и автосервисов: клиенты, автомобили, история визитов, фотоотчеты, напоминания и push-уведомления.'

export default function BusinessSeoPage() {
  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'CRM для детейлинга и СТО', path: '/business' },
    ]),
    buildSoftwareJsonLd({
      path: '/business',
      name: 'КарПас CRM для детейлинга и СТО',
      description,
      audience: 'Детейлинг-центры, СТО, автосервисы',
    }),
    buildFaqJsonLd([
      {
        question: 'Для каких сервисов подходит CRM КарПас?',
        answer:
          'Сервис подходит для детейлинг-центров, СТО, автосервисов и премиальных автомоек, которым нужна история клиентов и автомобилей.',
      },
      {
        question: 'Можно ли отправлять клиенту уведомление о готовности машины?',
        answer:
          'Да. В CRM предусмотрены push-уведомления и сценарии напоминаний после визита клиента.',
      },
    ]),
  ]

  return (
    <main className="container infoPage">
      <Seo title={title} description={description} canonicalPath="/business" jsonLd={jsonLd} />
      <section className="infoHero">
        <p className="muted small">КарПас для бизнеса</p>
        <h1 className="h1">CRM для детейлинга, СТО и автосервисов</h1>
        <p className="infoHero__lead">
          Ведите клиентов и автомобили, сохраняйте историю визитов, показывайте фотоотчеты до/после и возвращайте
          клиентов через напоминания.
        </p>
        <div className="row gap wrap">
          <Link className="btn" data-variant="primary" to="/auth/partner/apply">
            Подключить сервис
          </Link>
          <Link className="btn" data-variant="outline" to="/owners">
            Для владельцев авто
          </Link>
        </div>
      </section>

      <section className="infoGrid">
        <article>
          <h2 className="h2">Клиенты и автомобили</h2>
          <p className="muted">
            В карточке клиента видно авто, пробег, дату последнего визита, историю обслуживания и фото последнего визита.
          </p>
        </article>
        <article>
          <h2 className="h2">Фотоотчеты и доверие</h2>
          <p className="muted">
            Фото до/после помогают показать качество работ и сохранить понятную историю ухода за автомобилем.
          </p>
        </article>
        <article>
          <h2 className="h2">Локальное продвижение</h2>
          <p className="muted">
            Публичная страница сервиса помогает клиентам найти детейлинг или СТО в Москве, Воронеже, Ростове-на-Дону и
            других крупных городах.
          </p>
        </article>
      </section>
    </main>
  )
}
