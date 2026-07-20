import { Link } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildSoftwareJsonLd } from '../../seo/marketingJsonLd.js'
import { LandingNav } from '../../about-landing/LandingNav.tsx'
import { LandingFooter } from '../../about-landing/LandingFooter.tsx'
import { FadeSection } from '../../about-landing/FadeSection.tsx'
import { HowStep, FaqAccordion } from '../../about-landing/LandingPrimitives.tsx'
import { AppDownload } from '../../about-landing/AppDownload.tsx'
import bannerSrc from '../../assets/demo-detailing-banner.jpg?url'
import avatarSrc from '../../assets/demo-detailing-avatar.jpg?url'
import beforeSrc from '../../assets/demo-visit-before.jpg?url'
import afterSrc from '../../assets/demo-visit-after.jpg?url'
import '../../about-landing/AboutLanding.css'

const title = 'CRM для детейлинга и СТО — КарПас'
const description =
  'КарПас — CRM для детейлинга, СТО и автосервисов: клиенты, автомобили, история визитов, фотоотчеты, напоминания и push-уведомления.'

const faqItems = [
  {
    question: 'Для каких сервисов подходит CRM КарПас?',
    answer:
      'Сервис подходит для детейлинг-центров, СТО, автосервисов и премиальных автомоек, которым нужна история клиентов и автомобилей.',
  },
  {
    question: 'Можно ли отправлять клиенту уведомление о готовности машины?',
    answer: 'Да. В CRM предусмотрены push-уведомления и сценарии напоминаний после визита клиента.',
  },
  {
    question: 'Что если у клиента уже есть гараж в КарПас, а мой сервис ещё не подключён?',
    answer:
      'Владельцы могут вести историю своих автомобилей в КарПас самостоятельно, без вашего участия. Подключившись, вы отправляете заявку на привязку к автомобилю клиента — после одобрения ваши визиты и фотоотчеты добавляются в ту же историю, а ваше имя и логотип видны в ней как подтверждённый сервис.',
  },
  {
    question: 'Как связать автомобиль клиента с моим сервисом?',
    answer:
      'В разделе «Заявки» вы отправляете запрос на привязку по данным автомобиля клиента; после одобрения владельцем визиты синхронизируются автоматически.',
  },
  {
    question: 'Чем подтверждённая история полезна клиенту?',
    answer:
      'Подтверждённые записи от сервиса нельзя подделать, поэтому они повышают ценность автомобиля при продаже — клиент продаёт дороже. Это делает ваш сервис ценным для клиента и стимулирует возвращаться именно к вам.',
  },
]

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
    buildFaqJsonLd(faqItems),
  ]

  return (
    <div className="aboutLanding">
      <Seo title={title} description={description} canonicalPath="/business" jsonLd={jsonLd} />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          <FadeSection className="al-hero">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">КарПас для бизнеса</span>
            </div>
            <h1 className="al-hero__h1">CRM для детейлинга, СТО и автосервисов</h1>
            <p className="al-hero__sub">
              Ведите клиентов и автомобили, сохраняйте историю визитов, показывайте фотоотчеты до/после и
              возвращайте клиентов через напоминания.
            </p>
            <div className="al-hero__ctaRow">
              <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
                Подключить сервис
              </Link>
              <Link to="/" className="al-hero__scrollLink">
                Для владельцев авто →
              </Link>
            </div>
            <p className="al-heroNote">
              Работайте с системой где удобно: <b>мобильное приложение</b>, <b>веб</b> и <b>мобильная версия</b>.
              Визит и фотоотчёт можно добавить прямо с телефона в сервисе.
            </p>
            <AppDownload />
          </FadeSection>

          <FadeSection className="al-timeline">
            <h2 className="al-sectionTitle">
              Публичная страница — <b>в подарок</b>
            </h2>
            <p className="al-sectionSub">Готовый лендинг сервиса — сразу после подключения.</p>
            <div className="al-showcase">
              <div className="al-showcase__text">
                <p className="al-showcase__lead">
                  Вам не нужен отдельный сайт: КарПас даёт публичную страницу сервиса, которую можно указать
                  в соцсетях, на картах и в визитке.
                </p>
                <ul className="al-featureList">
                  <li>Баннер и аватар вашего бренда</li>
                  <li>Список услуг и режим работы</li>
                  <li>Галерея фото работ «до / после»</li>
                  <li>Кнопка «Позвонить» — клиент звонит в один тап</li>
                </ul>
              </div>
              <div className="al-dPreview">
                <div className="al-dPreview__banner">
                  <img src={bannerSrc} alt="Баннер студии детейлинга" />
                </div>
                <div className="al-dPreview__head">
                  <div className="al-dPreview__avatar">
                    <img src={avatarSrc} alt="Аватар сервиса" />
                  </div>
                  <div className="al-dPreview__headText">
                    <div className="al-dPreview__name">Luxe Auto Detailing</div>
                    <div className="al-dPreview__meta">Детейлинг · Москва</div>
                  </div>
                  <span className="al-dPreview__callBtn" aria-hidden="true">
                    Позвонить
                  </span>
                </div>
                <div className="al-dPreview__gallery">
                  <div className="al-dPreview__photo">
                    <img src={beforeSrc} alt="Полировка кузова — в процессе" />
                    <span className="al-dPreview__photoLabel">Процесс</span>
                  </div>
                  <div className="al-dPreview__photo">
                    <img src={afterSrc} alt="Автомобиль после детейлинга" />
                    <span className="al-dPreview__photoLabel">Результат</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>

          <FadeSection className="al-timeline">
            <h2 className="al-sectionTitle">
              Запись клиентов — <b>в один тап</b>
            </h2>
            <p className="al-sectionSub">Клиент нажимает «Записаться» — вы получаете заявку.</p>
            <div className="al-showcase">
              <div className="al-showcase__text">
                <p className="al-showcase__lead">
                  На визите от вашего сервиса в истории клиента появляется кнопка «Записаться». Он запрашивает
                  повтор в один клик, вы получаете уведомление и перезваниваете, чтобы назначить удобное время.
                </p>
                <ul className="al-featureList">
                  <li>Заявка приходит push-уведомлением</li>
                  <li>Видно клиента, услугу и автомобиль</li>
                  <li>Звонок и запись на удобное время</li>
                </ul>
              </div>
              <div className="al-toast">
                <span className="al-toast__dot" aria-hidden="true" />
                <div className="al-toast__body">
                  <div className="al-toast__title">Заявка</div>
                  <div className="al-toast__text">Иван И. — «Записаться»: Мойка, BMW M5 · сегодня, 10:24</div>
                </div>
                <span className="al-toast__action" aria-hidden="true">
                  Перезвонить
                </span>
              </div>
            </div>
          </FadeSection>

          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Что даёт <b>КарПас</b>
            </h2>
            <p className="al-sectionSub">Инструмент для доверия клиентов и повторных визитов.</p>
            <div className="al-benefits">
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Клиенты и автомобили</h3>
                <p className="al-benefitCard__text">
                  В карточке клиента видно авто, пробег, дату последнего визита, историю обслуживания и фото
                  последнего визита.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Фотоотчеты и доверие</h3>
                <p className="al-benefitCard__text">
                  Фото до/после помогают показать качество работ и сохранить понятную историю ухода за
                  автомобилем.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Локальное продвижение</h3>
                <p className="al-benefitCard__text">
                  Публичная страница сервиса помогает клиентам найти детейлинг или СТО в Москве, Воронеже,
                  Ростове-на-Дону и других крупных городах.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Клиенты уже могут быть в КарПас</h3>
                <p className="al-benefitCard__text">
                  Владельцы ведут историю своих автомобилей самостоятельно, даже если ваш сервис ещё не
                  подключён. Это готовая аудитория, а не конкурент вашей CRM.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Заявки на привязку авто</h3>
                <p className="al-benefitCard__text">
                  В разделе «Заявки» вы находите автомобиль клиента и отправляете запрос на привязку. После
                  одобрения визиты синхронизируются автоматически.
                </p>
              </article>
              <article className="al-benefitCard">
                <h3 className="al-benefitCard__title">Ценность для клиента</h3>
                <p className="al-benefitCard__text">
                  Ваше имя и логотип видны в истории авто как подтверждённый сервис. Такую историю нельзя подделать —
                  она повышает ценность машины при продаже, поэтому клиент продаёт дороже и возвращается именно к вам.
                </p>
              </article>
            </div>
          </FadeSection>

          <FadeSection className="al-timeline">
            <h2 className="al-sectionTitle">
              Как <b>подключиться</b>
            </h2>
            <p className="al-sectionSub">Три шага — и клиенты видят ваш сервис в истории своих авто.</p>
            <div className="al-how__list">
              <HowStep
                n="01"
                title="Оставьте заявку на партнёрство"
                desc="Расскажите о сервисе — подключим и настроим публичную страницу."
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
            <p className="al-sectionSub">Коротко о подключении и синхронизации истории.</p>
            <FaqAccordion items={faqItems} />
          </FadeSection>

          <FadeSection className="al-final">
            <div className="al-final__line" aria-hidden />
            <h2 className="al-final__h2">
              Начните вести <b>клиентов прозрачно.</b>
            </h2>
            <p className="al-final__sub">Бесплатный лендинг сервиса — в подарок при подключении.</p>
            <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
              Подключить сервис
            </Link>
            <p className="al-final__note">
              Уже есть аккаунт? <Link to="/auth/partner">Войти</Link>
            </p>
          </FadeSection>

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
