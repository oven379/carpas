import { Navigate } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { CarFront, ChevronDown, Heart, Layers, ShieldCheck, Users, Wrench } from 'lucide-react'
import { Seo } from '../../seo/Seo.jsx'
import { HOME_META_DESCRIPTION, HOME_TITLE } from '../../seo/seoConstants.js'
import { buildHomePageJsonLd } from '../../seo/homePageJsonLd.js'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { SUPPORT_LINK_HREF } from '../supportConfig.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { LandingNav } from '../../about-landing/LandingNav.tsx'
import { LandingFooter } from '../../about-landing/LandingFooter.tsx'
import { AppDownload } from '../../about-landing/AppDownload.tsx'
import { HomeHero } from '../../about-landing/HomeHero.jsx'
import { HomeFeatureShowcase } from '../../about-landing/HomeFeatureShowcase.jsx'
import { HomeProcess } from '../../about-landing/HomeProcess.jsx'
import roadPhoto from '../../assets/home-road-honda.webp'
import '../../about-landing/AboutLanding.css'
import '../../design/home-reference.css'
import '../../design/home-sections.css'

const HOME_SECTIONS = [
  { id: 'features', label: 'Возможности' },
  { id: 'how-it-works', label: 'Как это работает' },
  { id: 'faq', label: 'FAQ' },
]

const HOME_FAQ = [
  {
    question: 'Какие данные я получу по автомобилю?',
    answer: 'В карточке автомобиля можно хранить VIN, госномер, пробег, историю обслуживания, фотографии и документы. Записи владельца и подключённых сервисов отображаются отдельно.',
  },
  {
    question: 'Откуда берутся данные?',
    answer: 'Владелец сам добавляет сведения об автомобиле и визитах. Подключённые к КарПас сервисы могут добавлять свои записи о работах и фотоотчёты.',
  },
  {
    question: 'Как часто обновляется информация?',
    answer: 'История пополняется по мере сохранения новых записей. Вы можете добавлять их после каждого визита, а записи подключённого сервиса появляются в истории автоматически.',
  },
  {
    question: 'Нужно ли добавлять автомобиль в гараж?',
    answer: 'Да. Добавьте автомобиль в гараж, чтобы вести его историю и хранить пробег, фотографии и документы в одной карточке.',
  },
  {
    question: 'Кто может видеть мои данные?',
    answer: 'История автомобиля доступна в вашем аккаунте. Если вы поделитесь публичной ссылкой, по ней будут видны ваши записи и прикреплённые к ним документы. Визиты сервиса отображаются в личной истории.',
  },
]

const AUDIENCE_CARDS = [
  {
    icon: CarFront,
    title: 'Владельцам авто',
    text: 'Храните визиты, пробег, фото и документы по каждой машине. При продаже история поможет показать, как вы её обслуживали.',
  },
  {
    icon: Wrench,
    title: 'Сервисам и бизнесу',
    text: 'Ведите клиентов и визиты, добавляйте фотоотчёты и напоминания. Покажите услуги и контакты на своей публичной странице.',
  },
  { icon: ShieldCheck, title: 'Понятная история', text: 'Записи сервиса видны отдельно от записей владельца.' },
  { icon: Heart, title: 'Забота об авто', text: 'Пробег и напоминания помогают планировать следующее ТО.' },
]

function HomeSection({ id, variant, children }) {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.15 })

  return (
    <section ref={sectionRef} id={id} className={`homeSection homeSection--${variant}`}>
      <div className={inView ? 'homeContainer' : 'homeContainer homeContainer--pending'}>
        {children}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { detailing } = useDetailing()
  const [hadOwnerSession] = useState(hasOwnerSession)
  const homeJsonLd = useMemo(() => buildHomePageJsonLd(), [])
  const seoDesc = truncateMetaDescription(HOME_META_DESCRIPTION)

  // Новый вход из окна сам выбирает маршрут, включая настройки после регистрации.
  if (hadOwnerSession) return <Navigate to="/garage" replace />
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <div className="aboutLanding homeLight">
      <Seo title={HOME_TITLE} description={seoDesc} canonicalPath="/" jsonLd={homeJsonLd} />
      <LandingNav sections={HOME_SECTIONS} />
      <div className="homeOpening"><HomeHero /></div>

      <HomeSection id="how-it-works" variant="process">
        <HomeProcess />
      </HomeSection>

      <HomeSection id="features" variant="features">
        <HomeFeatureShowcase />
      </HomeSection>

      <HomeSection variant="audiences">
        <div className="homeSection__split">
          <header className="homeSection__header">
            <h2 className="homeSection__title">Две стороны <br /><em>одна история</em></h2>
            <p className="homeSection__intro">Один сервис для тех, кто владеет автомобилем, и тех, кто его обслуживает.</p>
            <ul className="homeAudienceHighlights" aria-label="Преимущества КарПас">
              <li><CarFront strokeWidth={1.7} aria-hidden="true" />Один сервис</li>
              <li><Layers strokeWidth={1.7} aria-hidden="true" />Единая история</li>
              <li><Users strokeWidth={1.7} aria-hidden="true" />Для владельцев и сервисов</li>
            </ul>
          </header>
          <div className="homeAudience">
            {AUDIENCE_CARDS.map(({ icon, title, text }) => {
              const Icon = icon
              return (
                <article className="homeAudience__item" key={title}>
                  <Icon size={27} strokeWidth={1.6} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </HomeSection>

      <HomeSection id="faq" variant="faq">
        <div className="homeSection__split">
          <header className="homeSection__header">
            <h2 className="homeSection__title">Ответы на популярные <em>вопросы</em></h2>
            <p className="homeSection__intro">Собрали ответы на самые частые вопросы о работе КарПас. Если остались вопросы, напишите нам.</p>
            <a className="al-btnPrimarySolid" href={SUPPORT_LINK_HREF} target="_blank" rel="noopener noreferrer">
              Задать вопрос
            </a>
          </header>
          <div className="homeFaq">
            {HOME_FAQ.map(({ question, answer }, index) => (
              <details key={question} className="homeLight__faqItem" name="home-faq" open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <ChevronDown className="homeFaq__chevron" size={22} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </HomeSection>

      <HomeSection id="download" variant="download">
        <div className="homeDownload">
          <img className="homeDownload__photo" src={roadPhoto} alt="" width="1440" height="960" loading="lazy" decoding="async" />
          <div className="homeDownload__copy">
            <h2 className="homeSection__title">История авто <em>всегда под рукой</em></h2>
            <p className="homeSection__intro">Начните вести историю своего автомобиля уже сегодня.</p>
            <AppDownload title="Скачать приложение" storeBadges />
          </div>
        </div>
        <LandingFooter />
      </HomeSection>
    </div>
  )
}
