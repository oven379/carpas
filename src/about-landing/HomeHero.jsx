import { Bell, FileText, Layers, ShieldCheck } from 'lucide-react'
import { LandingAuthLink } from './LandingAuthLink.tsx'
import avatarsSrc from '../assets/hero-users-avatars.webp'
import heroSrc from '../assets/home-mountain-honda.webp'
import heroMobileSrc from '../assets/home-mountain-honda-small.webp'

const benefits = [
  { icon: ShieldCheck, title: 'История автомобиля', text: 'Визиты, пробег и фото' },
  { icon: Layers, title: 'Учёт обслуживания', text: 'ТО, ремонты и замена деталей' },
  { icon: Bell, title: 'Напоминания', text: 'О предстоящем ТО' },
  { icon: FileText, title: 'Документы под рукой', text: 'VIN, госномер и файлы' },
]

function HeroCallout({ title, text, position, href }) {
  return (
    <a className={`homeHero__callout homeHero__callout--${position}`} href={href}>
      <span className="homeHero__calloutCopy"><strong>{title}</strong><span>{text}</span></span>
    </a>
  )
}

export function HomeHero() {
  return (
    <>
      <section className="homeHero" aria-labelledby="home-hero-title">
        <div className="homeHero__inner">
          <div className="homeHero__copy">
            <h1 id="home-hero-title" className="homeHero__title">
              <span>Вся история</span>{' '}
              <span>вашего авто</span>{' '}
              <span className="homeHero__accent">в одном сервисе</span>
            </h1>
            <p className="homeHero__description">
              Ведите историю, отслеживайте обслуживание и храните ключевые данные автомобиля.
            </p>
            <div className="homeHero__actions">
              <LandingAuthLink className="al-btnPrimarySolid">
                Начать пользоваться
              </LandingAuthLink>
              <p className="homeHero__platforms">
                <span className="homeHero__avatars" aria-hidden="true">
                  <img className="homeHero__avatar" src={avatarsSrc} alt="" width="44" height="44" />
                  <img className="homeHero__avatar" src={avatarsSrc} alt="" width="44" height="44" />
                  <img className="homeHero__avatar" src={avatarsSrc} alt="" width="44" height="44" />
                </span>
                <span><strong>7&#8239;345+</strong>{' '}<small>Пользователей</small></span>
              </p>
            </div>
          </div>

          <div className="homeHero__scene">
            <img
              src={heroSrc}
              srcSet={`${heroMobileSrc} 768w, ${heroSrc} 1536w`}
              sizes="(max-width: 800px) 100vw, (max-width: 1680px) 65vw, 1080px"
              className="homeHero__image"
              alt=""
              width="1536"
              height="1024"
              fetchPriority="high"
            />
            <div className="homeHero__vehicleLabel" aria-hidden="true">
              <span>HONDA PRELUDE</span>
              <small>Цифровая карточка авто</small>
            </div>
            <svg className="homeHero__sceneLines" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <path d="M308 160v108l17 29M756 73h-52l-48 103M852 517l-39-32h-32" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              <circle cx="325" cy="297" r="4.5" fill="currentColor" />
              <circle cx="656" cy="176" r="4.5" fill="currentColor" />
              <circle cx="781" cy="485" r="4.5" fill="currentColor" />
            </svg>
            <HeroCallout title="История авто" text="Визиты, пробег и фото" position="history" href="#how-it-works" />
            <HeroCallout title="Обслуживание" text="ТО, ремонты и детали" position="service" href="#features" />
          </div>
        </div>
      </section>
      <ul className="homeHeroBenefits" aria-label="Возможности КарПас">
        {benefits.map(({ icon, title, text }) => {
          const Icon = icon
          return (
            <li key={title}>
              <Icon size={32} strokeWidth={1.6} aria-hidden="true" />
              <div><strong>{title}</strong><span>{text}</span></div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
