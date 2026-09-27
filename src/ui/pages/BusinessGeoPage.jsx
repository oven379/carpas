import { Link, Navigate, useParams } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildSoftwareJsonLd } from '../../seo/marketingJsonLd.js'
import { LandingNav } from '../../about-landing/LandingNav.tsx'
import { LandingFooter } from '../../about-landing/LandingFooter.tsx'
import { FadeSection } from '../../about-landing/FadeSection.tsx'
import { HowStep, FaqAccordion } from '../../about-landing/LandingPrimitives.tsx'
import { AppDownload } from '../../about-landing/AppDownload.tsx'
import { getCityBySlug, businessCities } from './businessCities.js'
import '../../about-landing/AboutLanding.css'

export default function BusinessGeoPage() {
  const { city: slug } = useParams()
  const city = getCityBySlug(slug)

  if (!city) return <Navigate to="/business" replace />

  const { name, inCity } = city
  const title = `CRM для детейлинга и СТО ${inCity} — КарПас`
  const description = `КарПас — CRM и программа для детейлинга, тюнинга, автомоек и СТО ${inCity}: клиенты, история визитов, фотоотчёты и напоминания. Публичная страница сервиса и бесплатное подключение на этапе запуска.`

  const faqItems = [
    {
      question: `Работает ли КарПас ${inCity}?`,
      answer: `Да. КарПас работает по всей России, включая ${name}. Подключение и настройка — онлайн, приезжать никуда не нужно. Ваша публичная страница сервиса помогает клиентам ${inCity} найти вас по ссылке, в соцсетях и на картах.`,
    },
    {
      question: `Каким сервисам ${inCity} подходит КарПас?`,
      answer: `Детейлинг-центрам, тюнинг-ателье, студиям оклейки и автозвука, автомойкам, СТО и автосервисам ${inCity} — всем, кому нужна база клиентов, история обслуживания автомобилей и фотоотчёты.`,
    },
    {
      question: 'Сколько стоит подключение?',
      answer:
        'На этапе запуска подключение бесплатное: помощь с настройкой и публичная страница-лендинг сервиса включены. От вас — внести первых клиентов и попробовать.',
    },
  ]

  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'CRM для детейлинга и СТО', path: '/business' },
      { name, path: `/business/${slug}` },
    ]),
    buildSoftwareJsonLd({
      path: `/business/${slug}`,
      name: `КарПас — CRM для детейлинга и СТО ${inCity}`,
      description,
      audience: `Детейлинг, тюнинг, автомойки, СТО и автосервисы ${inCity}`,
    }),
    buildFaqJsonLd(faqItems),
  ]

  const otherCities = businessCities.filter((c) => c.slug !== slug)

  return (
    <div className="aboutLanding">
      <Seo title={title} description={description} canonicalPath={`/business/${slug}`} jsonLd={jsonLd} />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          <FadeSection className="al-hero">
            <nav className="blogCrumbs" aria-label="Хлебные крошки" style={{ marginBottom: 14 }}>
              <Link to="/">Главная</Link> · <Link to="/business">Бизнесу</Link> · {name}
            </nav>
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">КарПас {inCity}</span>
            </div>
            <h1 className="al-hero__h1">CRM для детейлинга, тюнинга и СТО {inCity}</h1>
            <p className="al-hero__sub">
              Ведите клиентов и историю их автомобилей, показывайте фотоотчёты «до/после» и возвращайте клиентов{' '}
              {inCity}. Публичная страница сервиса помогает клиентам {inCity} найти вас — по ссылке, в соцсетях и на
              картах.
            </p>
            <div className="al-hero__ctaRow">
              <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
                Подключить сервис
              </Link>
              <Link to="/business" className="al-btnOutline">
                Подробнее о CRM
              </Link>
            </div>
            <p className="al-heroNote">
              Подключение и настройка — онлайн. На этапе запуска бесплатно, лендинг сервиса в подарок.
            </p>
            <AppDownload />
          </FadeSection>

          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Что даёт КарПас сервисам {inCity}
            </h2>
            <p className="al-sectionSub">Инструмент для доверия клиентов и повторных визитов {inCity}.</p>
            <div className="al-benefits">
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Клиенты и автомобили</h3>
                <p className="al-benefitCard__text">
                  База клиентов и авто {inCity}: поиск за секунды по имени, телефону, VIN и госномеру, история
                  обслуживания и фото последнего визита.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Фотоотчёты и доверие</h3>
                <p className="al-benefitCard__text">
                  Фото «до/после» показывают качество работ и остаются у клиента в приложении — это портфолио и реклама
                  одновременно.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Локальное продвижение {inCity}</h3>
                <p className="al-benefitCard__text">
                  Публичная страница-витрина помогает клиентам {inCity} найти ваш детейлинг, тюнинг-ателье или СТО — по
                  ссылке, на картах и в соцсетях.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Напоминания и повторные визиты</h3>
                <p className="al-benefitCard__text">
                  Фильтр «Давно не были» и запись в один тап: клиент нажимает «Записаться» — вы получаете уведомление и
                  возвращаете его без скидок.
                </p>
              </article>
            </div>
          </FadeSection>

          <FadeSection className="al-timeline">
            <h2 className="al-sectionTitle">Как подключиться {inCity}</h2>
            <p className="al-sectionSub">Три шага — и клиенты видят ваш сервис в истории своих авто.</p>
            <div className="al-how__list">
              <HowStep
                n="01"
                title="Оставьте заявку на партнёрство"
                desc={`Расскажите о сервисе ${inCity} — подключим и настроим публичную страницу.`}
                showStem
              />
              <HowStep
                n="02"
                title="Привяжите автомобили клиентов"
                desc="Отправьте заявку на привязку по данным авто — клиент подтверждает в один клик."
                showStem
              />
              <HowStep
                n="03"
                title="Ведите историю прозрачно"
                desc="Визиты, фото и напоминания — клиент видит качество работы и возвращается."
                showStem={false}
              />
            </div>
          </FadeSection>

          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Частые <b>вопросы</b>
            </h2>
            <p className="al-sectionSub">Коротко о работе КарПас {inCity}.</p>
            <FaqAccordion items={faqItems} />
          </FadeSection>

          <FadeSection className="al-final">
            <div className="al-final__line" aria-hidden />
            <h2 className="al-final__h2">Подключите сервис {inCity}</h2>
            <p className="al-final__sub">Бесплатно на этапе запуска. Лендинг сервиса — в подарок.</p>
            <div className="al-hero__ctaRow" style={{ justifyContent: 'center' }}>
              <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
                Подключить сервис
              </Link>
            </div>
          </FadeSection>

          <FadeSection className="geoCities">
            <h2 className="al-sectionTitle">КарПас в других городах</h2>
            <div className="geoCities__list">
              {otherCities.map((c) => (
                <Link key={c.slug} to={`/business/${c.slug}`} className="geoCities__link">
                  CRM для детейлинга {c.inCity}
                </Link>
              ))}
            </div>
          </FadeSection>

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
