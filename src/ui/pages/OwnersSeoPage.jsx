import { Link } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildSoftwareJsonLd } from '../../seo/marketingJsonLd.js'

const title = 'История авто в телефоне — приложение КарПас'
const description =
  'КарПас помогает владельцу хранить историю обслуживания авто: визиты в сервис, пробег, документы, фотографии, заметки и рекомендации.'

export default function OwnersSeoPage() {
  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Владельцам авто', path: '/owners' },
    ]),
    buildSoftwareJsonLd({
      path: '/owners',
      name: 'КарПас для владельцев авто',
      description,
      audience: 'Владельцы автомобилей',
    }),
    buildFaqJsonLd([
      {
        question: 'Зачем хранить историю обслуживания автомобиля?',
        answer:
          'История обслуживания помогает помнить визиты в сервис, пробег, документы, фотографии работ и рекомендации мастеров.',
      },
      {
        question: 'Можно ли использовать КарПас как личный гараж?',
        answer:
          'Да. Владелец добавляет автомобили в гараж и хранит по каждому авто историю обслуживания, пробег, документы и фото.',
      },
    ]),
  ]

  return (
    <main className="container infoPage">
      <Seo title={title} description={description} canonicalPath="/owners" jsonLd={jsonLd} />
      <section className="infoHero">
        <p className="muted small">КарПас для владельцев авто</p>
        <h1 className="h1">История авто в вашем телефоне</h1>
        <p className="infoHero__lead">
          Для тех, кто действительно любит свою машину: храните обслуживание, пробег, документы, фотографии и важные
          заметки в одном личном гараже.
        </p>
        <div className="row gap wrap">
          <Link className="btn" data-variant="primary" to="/auth/owner">
            Создать гараж
          </Link>
          <Link className="btn" data-variant="outline" to="/business">
            Для детейлинга и СТО
          </Link>
        </div>
      </section>

      <section className="infoGrid">
        <article>
          <h2 className="h2">Что сохраняет КарПас</h2>
          <p className="muted">
            Визиты в сервис, дату обслуживания, пробег, фотоотчеты, документы, рекомендации, VIN, госномер и заметки по
            автомобилю.
          </p>
        </article>
        <article>
          <h2 className="h2">Когда это полезно</h2>
          <p className="muted">
            При регулярном уходе за авто, продаже машины, контроле пробега, хранении документов и общении с сервисом.
          </p>
        </article>
        <article>
          <h2 className="h2">Для каких авто</h2>
          <p className="muted">
            Для личных автомобилей, машин энтузиастов, семейных авто и клиентов детейлингов, СТО и автосервисов.
          </p>
        </article>
      </section>
    </main>
  )
}
