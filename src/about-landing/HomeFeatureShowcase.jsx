import { Bell, CarFront, Database, Wrench } from 'lucide-react'
import appArtwork from '../assets/home-app-showcase-honda.webp'
import appArtworkMobile from '../assets/home-app-showcase-honda-mobile.webp'
import { AppDownload } from './AppDownload.tsx'
import '../design/home-app-showcase.css'

const features = [
  { position: 'history', icon: CarFront, title: 'История авто', text: 'Пробег, визиты, документы' },
  { position: 'service', icon: Wrench, title: 'Обслуживание', text: 'ТО, ремонты, замена деталей' },
  { position: 'reminders', icon: Bell, title: 'Напоминания', text: 'ТО и важные события' },
  { position: 'expenses', icon: Database, title: 'Расходы', text: 'Чеки и документы' },
]

export function HomeFeatureShowcase() {
  return (
    <div className="homeShowcase">
      <div className="homeShowcase__copy">
        <h2 className="homeSection__title">
          <span>Контролируйте</span>{' '}
          <span>автомобиль</span>{' '}
          <em>каждый день</em>
        </h2>
        <p className="homeSection__intro homeShowcase__intro">
          Вся информация о вашем авто всегда под рукой: история, обслуживание, расходы и важные напоминания.
        </p>
        <div className="homeShowcase__actions">
          <AppDownload title={null} storeBadges />
        </div>
      </div>

      <div className="homeShowcase__scene">
        <picture className="homeShowcase__art">
          <source media="(max-width: 850px)" srcSet={appArtworkMobile} />
          <img src={appArtwork} alt="Два телефона с макетами КарПас: карточка Honda Prelude и история обслуживания" width="1672" height="941" loading="lazy" decoding="async" />
        </picture>

        <svg className="homeShowcase__connectors" viewBox="0 0 1672 941" aria-hidden="true">
          <path d="M777 329l24 41q7 12 19 12h36M775 625l19 31q6 10 17 10h37M1499 405l-23 41q-6 10-18 10h-37M1496 646l-16 27q-6 9-18 9h-34" />
          <circle cx="856" cy="382" r="7" />
          <circle cx="848" cy="666" r="7" />
          <circle cx="1421" cy="456" r="7" />
          <circle cx="1428" cy="682" r="7" />
        </svg>

        <ul className="homeShowcase__features" aria-label="Возможности мобильного КарПас">
          {features.map(({ position, icon, title, text }) => {
            const Icon = icon
            return (
              <li className={`homeShowcase__feature homeShowcase__feature--${position}`} key={position}>
                <span className="homeShowcase__featureIcon"><Icon strokeWidth={1.8} aria-hidden="true" /></span>
                <div><strong>{title}</strong><span>{text}</span></div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
