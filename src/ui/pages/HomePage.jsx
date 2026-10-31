import { Link, Navigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Seo } from '../../seo/Seo.jsx'
import { HOME_META_DESCRIPTION, HOME_TITLE } from '../../seo/seoConstants.js'
import { buildHomePageJsonLd } from '../../seo/homePageJsonLd.js'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { LandingNav } from '../../about-landing/LandingNav.tsx'
import { LandingFooter } from '../../about-landing/LandingFooter.tsx'
import { FadeSection } from '../../about-landing/FadeSection.tsx'
import { AppDownload } from '../../about-landing/AppDownload.tsx'
import productOverviewSrc from '../../assets/product-overview.png?url'
import screenGarageSrc from '../../assets/app-screen-garage.jpg?url'
import screenCarCardSrc from '../../assets/app-screen-car-card.jpg?url'
import screenHistoryListSrc from '../../assets/app-screen-history-list.jpg?url'
import screenNewVisitSrc from '../../assets/app-screen-new-visit.jpg?url'
import '../../about-landing/AboutLanding.css'

// Реальные экраны приложения — витрина для главной (гараж, карточка авто, история, визит сервиса).
const HOME_SCREENS = [
  {
    src: screenGarageSrc,
    title: 'Гараж владельца',
    text: 'Все автомобили в одном месте — с фото и данными.',
    alt: 'Гараж владельца в приложении КарПас',
  },
  {
    src: screenCarCardSrc,
    title: 'Карточка авто',
    text: 'VIN, госномер, пробег, документы и заметки.',
    alt: 'Карточка автомобиля в приложении КарПас',
  },
  {
    src: screenHistoryListSrc,
    title: 'История обслуживания',
    text: 'Визиты, работы и фотоотчёты по датам и пробегу.',
    alt: 'История обслуживания авто в приложении КарПас',
  },
  {
    src: screenNewVisitSrc,
    title: 'Визит в сервисе',
    text: 'Сервис вносит работы и фото — история пополняется сама.',
    alt: 'Новый визит в CRM сервиса КарПас',
  },
]

// Главная (/) — обзор сервиса и точка входа: отсюда уходят к владельцам (/owners) и бизнесу (/business).
export default function HomePage() {
  const { detailing } = useDetailing()
  const homeJsonLd = useMemo(() => buildHomePageJsonLd(), [])
  const seoDesc = truncateMetaDescription(HOME_META_DESCRIPTION)

  if (hasOwnerSession()) return <Navigate to="/garage" replace />
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <div className="aboutLanding">
      <Seo title={HOME_TITLE} description={seoDesc} canonicalPath="/" jsonLd={homeJsonLd} />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          {/* Герой */}
          <FadeSection className="al-hero">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">О сервисе</span>
            </div>
            <h1 className="al-hero__h1">
              КарПас — <b>цифровая история автомобиля</b> и CRM для сервиса
            </h1>
            <p className="al-hero__sub">
              Владельцам — личный гараж в телефоне с историей обслуживания, пробегом, фото и документами по каждому авто.
              Детейлингам, мойкам, СТО, тюнинг-ателье и пригонщикам — CRM, бесплатная на этапе запуска, с визитами, фотоотчётами,
              напоминаниями и публичной страницей-витриной. Одна история — обе стороны.
            </p>
            <div className="al-hero__ctaRow">
              <Link to="/owners" className="al-btnPrimarySolid">
                Владельцам авто
              </Link>
              <Link to="/business" className="al-btnOutline">
                Сервисам и бизнесу
              </Link>
            </div>
            <p className="al-heroNote">
              Бесплатно для владельцев. Бесплатно на этапе запуска для сервисов. iOS, Android и веб.
            </p>
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

          {/* Для кого — две аудитории, у каждой своя кнопка */}
          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Для кого <b>КарПас</b>
            </h2>
            <p className="al-sectionSub">Один сервис одинаково полезен и владельцу авто, и бизнесу.</p>
            <div className="al-benefits al-benefits--audience">
              <article className="al-benefitCard al-benefitCard--audience">
                <h3 className="al-benefitCard__title">Владельцам авто</h3>
                <p className="al-benefitCard__text">
                  Вся история обслуживания — в телефоне: визиты, пробег, фото работ, документы и напоминания о ТО.
                  История с фото и документами помогает показать покупателю, как обслуживалась машина.
                </p>
                <Link to="/owners" className="al-btnPrimarySolid al-benefitCard__cta">
                  Подробнее для владельцев
                </Link>
              </article>
              <article className="al-benefitCard al-benefitCard--audience">
                <h3 className="al-benefitCard__title">Сервисам и бизнесу</h3>
                <p className="al-benefitCard__text">
                  Детейлинг, мойка, СТО, тюнинг-ателье, пригон авто: CRM — клиенты, визиты с фото, заметки и
                  напоминания «давно не были». Публичная страница-витрина — в подарок.
                </p>
                <Link to="/business" className="al-btnOutline al-benefitCard__cta">
                  Подробнее для бизнеса
                </Link>
              </article>
            </div>
          </FadeSection>

          {/* УТП */}
          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Почему <b>КарПас</b>
            </h2>
            <p className="al-sectionSub">Главные преимущества сервиса.</p>
            <div className="al-benefits">
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Единая история авто</h3>
                <p className="al-benefitCard__text">
                  Все работы по машине в одном месте — с датой, пробегом и фото. Работает с подключённым сервисом и без
                  него.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Подтверждённые записи</h3>
                <p className="al-benefitCard__text">
                  В истории видно, какие визиты добавлены владельцем, а какие — подключённым сервисом.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">CRM для сервиса</h3>
                <p className="al-benefitCard__text">
                  Клиенты, автомобили, визиты, фотоотчёты и напоминания — без абонентской платы на этапе запуска.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Публичная страница-витрина</h3>
                <p className="al-benefitCard__text">
                  Готовая страница сервиса с услугами и контактами — ссылка для клиентов, соцсетей и рекламы.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Напоминания о ТО</h3>
                <p className="al-benefitCard__text">
                  Приложение подскажет, когда пора на обслуживание, — ничего не забудется.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Везде одна история</h3>
                <p className="al-benefitCard__text">
                  Мобильное приложение для iOS и Android плюс веб — данные синхронны на всех устройствах.
                </p>
              </article>
            </div>
          </FadeSection>

          {/* Как это выглядит — реальные экраны */}
          <FadeSection className="al-screens">
            <h2 className="al-sectionTitle">
              Как это <b>выглядит</b>
            </h2>
            <p className="al-sectionSub">Реальные экраны КарПас — гараж, карточка авто, история и визит сервиса.</p>
            <div className="al-screensGrid">
              {HOME_SCREENS.map((s) => (
                <figure className="al-screen" key={s.title}>
                  <div className="al-screen__photo">
                    <img src={s.src} alt={s.alt} loading="lazy" />
                  </div>
                  <figcaption className="al-screen__caption">
                    <span className="al-screen__title">{s.title}</span>
                    <span className="al-screen__text">{s.text}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </FadeSection>

          {/* Финал + скачать приложение */}
          <FadeSection className="al-final">
            <div className="al-final__line" aria-hidden />
            <h2 className="al-final__h2">
              Начните вести <b>историю своего авто</b>
            </h2>
            <p className="al-final__sub">Бесплатно для владельцев. Бесплатно на этапе запуска для сервисов.</p>
            <div className="al-hero__ctaRow" style={{ justifyContent: 'center' }}>
              <Link to="/owners" className="al-btnPrimarySolid">
                Владельцам авто
              </Link>
              <Link to="/business" className="al-btnOutline">
                Сервисам и бизнесу
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
