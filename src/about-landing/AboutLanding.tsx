import { Link } from 'react-router-dom'
import carPhotoSrc from '../assets/bmw.jpg?url'
import { FadeSection } from './FadeSection.tsx'
import { LandingNav } from './LandingNav.tsx'
import { LandingFooter } from './LandingFooter.tsx'
import { HowStep, TimelineItem, FaqAccordion } from './LandingPrimitives.tsx'
import { AppDownload } from './AppDownload.tsx'
import './AboutLanding.css'

/** FAQ владельца — экспортируется, чтобы HomePage добавил FAQPage в JSON-LD. */
export const ownerFaqItems = [
  {
    question: 'Зачем хранить историю обслуживания автомобиля?',
    answer:
      'История обслуживания помогает помнить визиты в сервис, пробег, документы, фотографии работ и рекомендации мастеров. Главное — прозрачная история повышает ценность авто при продаже: покупатель видит, как обслуживалась машина, и готов платить больше. Особенно ценится подтверждённая история от детейлингов и СТО — записи от сервиса нельзя подделать.',
  },
  {
    question: 'Нужно ли подключение к детейлингу или СТО, чтобы вести историю?',
    answer:
      'Нет. Владелец может полностью самостоятельно вносить визиты: название работ, пробег, фото и документы — без привязки к какому-либо сервису. Подключение партнёра — это дополнительная возможность, а не обязательное условие.',
  },
  {
    question: 'Что будет, если мой детейлинг или СТО подключится к КарПас позже?',
    answer:
      'Записи и фотоотчеты от подключённого сервиса начнут автоматически добавляться в ту же историю автомобиля — рядом с визитами, которые вы уже внесли сами. Переносить ничего не нужно.',
  },
  {
    question: 'Можно ли использовать КарПас как личный гараж?',
    answer:
      'Да. Владелец добавляет автомобили в гараж и хранит по каждому авто историю обслуживания, пробег, документы и фото. А при продаже эта история становится аргументом в цене — особенно если часть визитов подтверждена детейлингами и СТО.',
  },
  {
    question: 'Как вести историю обслуживания автомобиля?',
    answer:
      'Добавьте автомобиль в гараж (марка, модель, госномер) и после каждого визита создавайте запись: что делали, дату, пробег, приложите фото и документы. Так историю можно вести самому. Если ваш детейлинг или СТО работает в КарПас, его записи и фотоотчеты добавляются в ту же историю автоматически.',
  },
  {
    question: 'Как найти детейлинг или СТО в КарПас?',
    answer:
      'У каждого подключённого сервиса есть публичная страница с услугами, фото работ и кнопкой «Позвонить» — её можно найти по ссылке, в соцсетях и на картах. Сервисы, у которых вы обслуживались, отображаются в истории вашего автомобиля.',
  },
]

export default function AboutLanding() {
  return (
    <div className="aboutLanding">
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
        <FadeSection className="al-hero">
          <div className="al-eyebrow">
            <span className="al-eyebrow__text">Цифровой паспорт автомобиля</span>
          </div>
          <h1 className="al-hero__h1">
            Каждый автомобиль заслуживает своей <b>биографии.</b>
          </h1>
          <p className="al-hero__sub">
            Полная прозрачная история обслуживания — от первой полировки до последней записи детейлинга.
            А при продаже такая история повышает ценность авто, особенно подтверждённая детейлингами и СТО.
          </p>
          <div className="al-hero__ctaRow">
            <Link to="/auth/owner" className="al-btnPrimarySolid">
              Добавить авто
            </Link>
            <Link to="/business" className="al-btnOutline">
              Я детейлинг / СТО
            </Link>
          </div>
          <p className="al-heroNote">
            Добавляйте визиты и фото где удобно: <b>мобильное приложение</b> (iOS и Android), <b>мобильная</b> и{' '}
            <b>веб-версия</b> сайта — история везде одна.
          </p>
          <AppDownload />
        </FadeSection>

        <FadeSection className="al-timeline">
          <h2 className="al-sectionTitle">
            Живая <b>биография</b>
          </h2>
          <p className="al-sectionSub">Каждый визит — новая запись. Вносите сами или сервис добавит за вас.</p>

          <div className="al-timeline__layout">
            <div className="al-timeline__feed">
              <TimelineItem
                index={0}
                active
                hasStem
                date="14 апреля 2025"
                name="Керамическое покрытие"
                badge="Кузов"
                text="Нанесение двухслойного керамического покрытия. Предварительная полировка 2 step. Срок защиты — 3 года."
                footerLeft={
                  <>
                    Мастер: <span>Luxe Auto Detailing</span>
                  </>
                }
                footerRight="✓ Подтверждено"
              />
              <TimelineItem
                index={1}
                active
                hasStem
                date="01 марта 2025"
                name="Химчистка салона"
                badge="Салон"
                text="Полная химчистка велюровых сидений и потолка. Озонирование."
                footerLeft={
                  <>
                    Мастер: <span>Clean Studio</span>
                  </>
                }
                footerRight="✓ Подтверждено"
              />
              <TimelineItem
                index={2}
                active={false}
                hasStem={false}
                muted
                date="Январь 2025"
                name="Полировка кузова"
                badge="Кузов"
                text="Удаление голограмм, мойка, сушка."
              />
            </div>

            <aside className="al-carCard">
              <div className="al-carPhoto car-photo-placeholder">
                <img src={carPhotoSrc} alt="BMW M5 headlight" />
                <span className="al-carPhoto__label">BMW M5 · 2021</span>
              </div>
              <div className="al-carCard__body">
                <div className="al-carCard__plate">A 777 AA</div>
                <div className="al-carCard__model">BMW M5 · F90 · 2021</div>
                <div className="al-carCard__goldLine" aria-hidden />
                <div className="al-carStatRow">
                  <span className="al-carStatRow__k">Пробег</span>
                  <span className="al-carStatRow__v">42 100 км</span>
                </div>
                <div className="al-carStatRow">
                  <span className="al-carStatRow__k">Визитов</span>
                  <span className="al-carStatRow__v al-carStatRow__v--accent">3</span>
                </div>
                <div className="al-carStatRow">
                  <span className="al-carStatRow__k">Последний</span>
                  <span className="al-carStatRow__v">14 апр</span>
                </div>
              </div>
              <div className="al-carCard__footer">
                <button type="button" className="al-carCard__share">
                  Поделиться ↗
                </button>
              </div>
            </aside>
          </div>
        </FadeSection>

        <FadeSection className="al-how">
          <h2 className="al-sectionTitle">
            Что даёт <b>КарПас</b>
          </h2>
          <p className="al-sectionSub">Полноценная история — с сервисом или без него.</p>
          <div className="al-benefits">
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Работает без подключённого сервиса</h3>
              <p className="al-benefitCard__text">
                Детейлинг или СТО не обязаны использовать КарПас, чтобы вы вели историю. Вносите визиты сами: ТО,
                мойка, шиномонтаж, ремонт — что угодно, с пробегом, фото и документами.
              </p>
            </article>
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Станет удобнее, если сервис подключится</h3>
              <p className="al-benefitCard__text">
                Записи и фотоотчеты «до/после» от подключённого партнёра добавляются в ту же историю автоматически
                — рядом с визитами, которые вы уже внесли сами.
              </p>
            </article>
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Всегда знаете, что делали</h3>
              <p className="al-benefitCard__text">
                Что меняли, когда и при каком пробеге — вся история под рукой. Не нужно вспоминать, когда была
                последняя замена масла или какие работы уже делали.
              </p>
            </article>
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Доверие покупателя — дороже при продаже</h3>
              <p className="al-benefitCard__text">
                Прозрачная история повышает доверие к продавцу: покупатель видит, как обслуживалась машина, и готов
                платить больше. Визиты, подтверждённые детейлингами и СТО, нельзя подделать — им доверяют особенно.
              </p>
            </article>
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Что сохраняет КарПас</h3>
              <p className="al-benefitCard__text">
                Визиты, дату обслуживания, пробег, фотоотчеты, документы, рекомендации, VIN, госномер и заметки по
                автомобилю.
              </p>
            </article>
            <article className="al-benefitCard">
              <h3 className="al-benefitCard__title">Для каких авто</h3>
              <p className="al-benefitCard__text">
                Для личных автомобилей, машин энтузиастов, семейных авто и клиентов детейлингов, СТО и автосервисов.
              </p>
            </article>
          </div>
        </FadeSection>

        <FadeSection id="how-it-works" className="al-timeline">
          <h2 className="al-sectionTitle">
            Как это <b>работает</b>
          </h2>
          <p className="al-sectionSub">Три шага — и биография вашего авто под рукой.</p>
          <div className="al-how__list">
            <HowStep n="01" title="Добавьте автомобиль" desc="Укажите марку, модель и номер — и ваш гараж готов." showStem />
            <HowStep
              n="02"
              title="Ведите визиты сами или через сервис"
              desc="Записывайте пробег, фото и работы вручную — сервис не обязателен. Если детейлинг или СТО подключены к КарПас, их записи и фотоотчеты добавляются в ту же историю автоматически."
              showStem
            />
            <HowStep n="03" title="Дороже при продаже" desc="Поделитесь ссылкой — покупатель видит всю историю. Прозрачная история, особенно подтверждённая детейлингами и СТО, повышает ценность авто." showStem={false} />
          </div>
        </FadeSection>

        <FadeSection className="al-how">
          <h2 className="al-sectionTitle">
            Частые <b>вопросы</b>
          </h2>
          <p className="al-sectionSub">Коротко о ведении истории и ценности авто при продаже.</p>
          <FaqAccordion items={ownerFaqItems} />
        </FadeSection>

        <FadeSection className="al-det">
          <div className="al-det__inner">
            <div className="al-det__eyebrow">Для детейлинга и СТО</div>
            <h2 className="al-det__title">Ведите клиентов прозрачно — они вернутся.</h2>
            <p className="al-det__sub">
              Каждая запись — это ваше портфолио. Клиент видит качество, доверяет и рекомендует. А публичная страница
              сервиса помогает новым клиентам найти вас — по ссылке, в соцсетях и на картах.
            </p>
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <Link to="/auth/partner/apply" className="al-det__link">
                Стать партнёром →
              </Link>
              <Link to="/business" className="al-det__link al-det__link--secondary">
                Подробнее о CRM →
              </Link>
            </div>
          </div>
        </FadeSection>

        <FadeSection className="al-final">
          <div className="al-final__line" aria-hidden />
          <h2 className="al-final__h2">
            Начните вести <b>биографию своего авто.</b>
          </h2>
          <p className="al-final__sub">Бесплатно. Навсегда. С первого визита.</p>
          <Link to="/auth/owner" className="al-btnPrimarySolid">
            Добавить авто
          </Link>
          <p className="al-final__note">
            Уже есть аккаунт?{' '}
            <Link to="/auth">Войти</Link>
          </p>
        </FadeSection>

        <LandingFooter />
        </div>
      </div>
    </div>
  )
}
