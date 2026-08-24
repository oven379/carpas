import { Link } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd } from '../../seo/marketingJsonLd.js'
import { LandingNav } from '../../about-landing/LandingNav.tsx'
import { LandingFooter } from '../../about-landing/LandingFooter.tsx'
import { FadeSection } from '../../about-landing/FadeSection.tsx'
import { AppDownload } from '../../about-landing/AppDownload.tsx'
import productOverviewSrc from '../../assets/product-overview.png?url'
import '../../about-landing/AboutLanding.css'

export default function AboutPage() {
  const description =
    'КарПас — российский сервис истории автомобиля и CRM для детейлинга, СТО и автосервисов. История авто, документы, фото и визиты в одном месте.'
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Главная', path: '/' },
    { name: 'О сервисе', path: '/about' },
  ])

  return (
    <div className="aboutLanding">
      <Seo title="О сервисе КарПас" description={description} canonicalPath="/about" jsonLd={jsonLd} />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          <FadeSection className="al-hero">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">О проекте</span>
            </div>
            <h1 className="al-hero__h1">
              КарПас — <b>история авто и сервисная CRM</b>
            </h1>
            <p className="al-hero__sub">
              Мы создаём единую цифровую историю автомобиля: для владельцев это личный гараж в телефоне, для
              детейлингов и СТО — удобная CRM с визитами, фотоотчётами и напоминаниями. Одна история — обе стороны.
            </p>
            <div className="al-hero__ctaRow">
              <Link to="/" className="al-btnPrimarySolid">
                Владельцам авто
              </Link>
              <Link to="/business" className="al-btnOutline">
                Детейлингу и СТО
              </Link>
            </div>
            <div className="al-frame al-shot">
              <div className="al-frame__bar" aria-hidden="true">
                <span className="al-frame__dot" />
                <span className="al-frame__dot" />
                <span className="al-frame__dot" />
              </div>
              <img
                className="al-frame__img"
                src={productOverviewSrc}
                alt="Приложение КарПас: гараж клиента, карточка авто и история визитов"
                loading="lazy"
              />
            </div>
          </FadeSection>

          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Две стороны — <b>одна история</b>
            </h2>
            <p className="al-sectionSub">Один сервис, который одинаково полезен владельцу и сервису.</p>
            <div className="al-benefits">
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Владельцам авто</h3>
                <p className="al-benefitCard__text">
                  Личный гараж в телефоне: история обслуживания, пробег, фото и документы по каждому авто.
                  Прозрачная история повышает ценность машины при продаже.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Детейлингу и СТО</h3>
                <p className="al-benefitCard__text">
                  CRM с клиентами и автомобилями, историей визитов, фотоотчётами и напоминаниями. Плюс публичная
                  страница сервиса — в подарок.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Что сохраняет КарПас</h3>
                <p className="al-benefitCard__text">
                  Визиты, дату обслуживания, пробег, фотоотчёты, документы, рекомендации мастера, VIN, госномер и
                  заметки по автомобилю.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Где работает</h3>
                <p className="al-benefitCard__text">
                  Мобильное приложение для iOS и Android, а также веб и мобильная версия сайта — история везде одна.
                </p>
              </article>
            </div>
          </FadeSection>

          <FadeSection className="al-final">
            <div className="al-final__line" aria-hidden />
            <h2 className="al-final__h2">
              Начните вести <b>историю своего авто</b>
            </h2>
            <p className="al-final__sub">Бесплатно для владельцев. Бесплатно на этапе запуска для сервисов.</p>
            <div className="al-hero__ctaRow" style={{ justifyContent: 'center' }}>
              <Link to="/auth/owner" className="al-btnPrimarySolid">
                Добавить авто
              </Link>
              <Link to="/business" className="al-btnOutline">
                Подробнее для бизнеса
              </Link>
            </div>
            <div style={{ marginTop: 24 }}>
              <AppDownload title="Скачать приложение" />
            </div>
          </FadeSection>

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
