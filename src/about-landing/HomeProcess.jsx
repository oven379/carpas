import { ArrowRight, CarFront, ChartNoAxesColumnIncreasing, Wrench } from 'lucide-react'
import carPhoto from '../assets/home-process-honda.webp'
import '../design/home-process.css'

const steps = [
  { icon: CarFront, title: 'Добавьте автомобиль', text: 'Укажите данные авто или VIN, чтобы добавить его в гараж.' },
  { icon: Wrench, title: 'Сохраняйте визиты', text: 'Добавляйте записи о ТО, ремонтах и заменах с фото и документами.' },
  { icon: ChartNoAxesColumnIncreasing, title: 'Следите за историей', text: 'Пробег, выполненные работы и документы всегда под рукой.' },
]

export function HomeProcess() {
  return (
    <>
      <div className="homeProcess">
        <div className="homeProcess__copy">
          <h2 className="homeSection__title">Как это <em>работает</em></h2>
          <p className="homeProcess__intro">
            Все данные об обслуживании вашего автомобиля — в одном месте.
            Добавьте авто в гараж, сохраняйте визиты в сервис и следите за историей.
          </p>
        </div>

        <figure className="homeProcess__visual">
          <img className="homeProcess__photo" src={carPhoto} alt="Серебристая Honda Prelude у здания из светлого камня" width="1440" height="720" loading="lazy" decoding="async" />
        </figure>
      </div>

      <ol className="homeProcessSteps" aria-label="Три шага работы с КарПас">
        {steps.map(({ icon, title, text }, index) => {
          const Icon = icon
          return (
            <li className="homeProcessSteps__item" key={title}>
              <div className="homeProcessSteps__heading">
                <span className="homeProcessSteps__icon"><Icon strokeWidth={1.6} aria-hidden="true" /></span>
                <div>
                  <span className="homeProcessSteps__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                </div>
              </div>
              <p>{text}</p>
              {index < steps.length - 1 && <ArrowRight className="homeProcessSteps__arrow" strokeWidth={1.5} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </>
  )
}
