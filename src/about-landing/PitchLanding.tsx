import { Link } from 'react-router-dom'
import screenGarageSrc from '../assets/app-screen-garage.jpg?url'
import screenCarCardSrc from '../assets/app-screen-car-card.jpg?url'
import screenHistoryListSrc from '../assets/app-screen-history-list.jpg?url'
import screenNewVisitSrc from '../assets/app-screen-new-visit.jpg?url'
import screenHistoryOwnerSrc from '../assets/app-screen-history-owner.jpg?url'
import screenHistoryServiceSrc from '../assets/app-screen-history-service.jpg?url'
import crmPanelSrc from '../assets/crm-panel.png?url'
import partnerLandingSrc from '../assets/partner-landing.png?url'
import productOverviewSrc from '../assets/product-overview.png?url'
import { FadeSection } from './FadeSection.tsx'
import { LandingNav } from './LandingNav.tsx'
import { LandingFooter } from './LandingFooter.tsx'
import { HowStep } from './LandingPrimitives.tsx'
import { AppDownload } from './AppDownload.tsx'
import './AboutLanding.css'
import './PitchLanding.css'

/** Приложение клиента — 6 реальных экранов (текст из презентации, слайд 4). */
const clientScreens = [
  {
    src: screenGarageSrc,
    alt: 'Экран «Гараж» в приложении КарПас со списком автомобилей',
    title: 'Гараж клиента',
    text: 'Все автомобили клиента в одном месте — с фото, годом и пробегом.',
  },
  {
    src: screenCarCardSrc,
    alt: 'Карточка автомобиля с фото, VIN, госномером и последним визитом',
    title: 'Карточка авто',
    text: 'Фото, госномер, VIN, пробег и последний визит — коротко и по делу.',
  },
  {
    src: screenHistoryListSrc,
    alt: 'История визитов с фильтрами «Все», «От сервиса», «Моя история»',
    title: 'История визитов',
    text: 'Вся история одним списком: записи клиента и подтверждённые визиты сервиса.',
  },
  {
    src: screenHistoryServiceSrc,
    alt: 'Детали визита от сервиса с фото до/после и кнопкой «Записаться»',
    title: 'Детали визита + фото',
    text: 'Услуги, фотоотчёт до/после и рекомендации мастера — прямо в карточке визита.',
  },
  {
    src: screenHistoryOwnerSrc,
    alt: 'Рекомендации мастера в истории автомобиля',
    title: 'Рекомендации мастера',
    text: 'Совет к следующему визиту виден клиенту — он вернётся именно к вам.',
  },
  {
    src: screenNewVisitSrc,
    alt: 'Форма добавления нового визита в приложении КарПас',
    title: 'Добавить визит',
    text: 'Клиент ведёт и свою историю: пробег, услуги, фото — черновик сохраняется сам.',
  },
]

/** Где бизнес теряет деньги (слайд 2). */
const painPoints = [
  {
    title: 'Клиент уехал — нет причины вернуться',
    text: 'Без напоминания клиент идёт к тому, кто даст скидку или будет ближе.',
  },
  {
    title: 'Мастер уволился — знания ушли с ним',
    text: 'Что делали, что рекомендовали — никакой передачи между визитами.',
  },
  {
    title: 'CRM — только для вас, клиент ничего не видит',
    text: 'Нет разницы между вами и любым другим сервисом в глазах клиента.',
  },
  {
    title: 'Повторные продажи — случайность',
    text: 'Никто не напоминает, не предлагает, не записывает. Всё держится на памяти.',
  },
]

/** Панель сервиса — что видит детейлинг/СТО (слайд 5). */
const panelFeatures = [
  {
    title: 'Найти клиента за 3 секунды',
    text: 'Поиск по имени, телефону, VIN-коду и госномеру — вся база под рукой.',
  },
  {
    title: 'Фильтр «Давно не были»',
    text: 'Сразу видно, кого не было больше 15 дней и кому напомнить о визите.',
  },
  {
    title: 'Заметка о клиенте',
    text: 'Предпочтения, важные детали, на что обратить внимание — в карточке.',
  },
  {
    title: 'Уведомления от клиентов',
    text: 'Клиент нажал «Записаться» — вы получаете уведомление и перезваниваете.',
  },
]

/** Что это даёт бизнесу (слайд 6). */
const businessValue = [
  {
    n: '1',
    title: 'Доверие — без скидок и акций',
    text: 'Клиент возвращается не потому что вы дали скидку — а потому что его машина здесь.',
  },
  {
    n: '2',
    title: 'Клиент записывается сам — через кнопку',
    text: 'Мастер оставил рекомендацию, клиент открыл приложение и нажал кнопку. Вы перезваниваете, когда удобно.',
  },
  {
    n: '3',
    title: 'Реклама привлекает — КарПас возвращает',
    text: 'Через год у вас живая база клиентов, которые приходят сами. Это и есть настоящий актив.',
  },
  {
    n: '4',
    title: 'Фото работ — в руках клиента',
    text: 'Клиент видит, что сделали и как выглядит результат. Он помнит, за что заплатил.',
  },
]

export default function PitchLanding() {
  return (
    <div className="aboutLanding pitchLanding">
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          {/* ——— HERO ——— */}
          <FadeSection className="al-hero">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">История вашего авто</span>
            </div>
            <h1 className="al-hero__h1">
              Две стороны. <b>Одна история автомобиля.</b>
            </h1>
            <p className="al-hero__sub">
              КарПас — сервис для вашего клиента. Детейлинг и СТО ведут историю обслуживания,
              а клиент видит её в приложении, хранит фото работ и записывается в один тап.
            </p>
            <div className="al-hero__ctaRow">
              <Link to="/auth/owner" className="al-btnPrimarySolid">
                Добавить авто
              </Link>
              <a href="#pl-business" className="al-btnOutline">
                Я детейлинг / СТО
              </a>
            </div>
            <p className="al-heroNote">
              Работает где удобно: <b>мобильное приложение</b> (iOS и Android), <b>мобильная</b> и{' '}
              <b>веб-версия</b> — история везде одна.
            </p>
            <AppDownload />
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

          {/* ——— ПРОБЛЕМА ——— */}
          <FadeSection className="pl-pain">
            <div className="al-eyebrow al-eyebrow--danger">
              <span className="al-eyebrow__text">Где бизнес теряет деньги</span>
            </div>
            <h2 className="al-sectionTitle">
              Вы теряете клиентов <b>не потому, что плохо работаете</b>
            </h2>
            <p className="al-sectionSub">
              Причина в другом — клиенту нечем вспомнить о вас, а вам нечем напомнить о себе.
            </p>
            <div className="pl-painGrid">
              {painPoints.map((p) => (
                <article className="pl-painCard" key={p.title}>
                  <h3 className="pl-painCard__title">{p.title}</h3>
                  <p className="pl-painCard__text">{p.text}</p>
                </article>
              ))}
            </div>
            <div className="pl-solve">
              КарПас решает именно эти ситуации. И самое важное —{' '}
              <b>клиент участвует в истории своего авто.</b>
            </div>
          </FadeSection>

          {/* ——— ДВЕ СТОРОНЫ ——— */}
          <FadeSection className="pl-sides">
            <h2 className="al-sectionTitle">
              Продукт — <b>две стороны, одна история</b>
            </h2>
            <p className="al-sectionSub">Два приложения. Одна история автомобиля.</p>
            <div className="pl-sidesGrid">
              <article className="pl-sideCard">
                <div className="pl-sideCard__tag">Со стороны сервиса</div>
                <ul className="al-featureList">
                  <li>Карточка клиента и авто — запись с телефона и компьютера</li>
                  <li>Мастер вносит услуги и фото</li>
                  <li>Оставляет рекомендации и совет к визиту</li>
                  <li>История появляется сразу после сохранения визита</li>
                </ul>
              </article>
              <div className="pl-sidesLink" aria-hidden="true">
                ⟷
              </div>
              <article className="pl-sideCard pl-sideCard--client">
                <div className="pl-sideCard__tag pl-sideCard__tag--client">Со стороны клиента</div>
                <ul className="al-featureList">
                  <li>Видит историю своего авто</li>
                  <li>Фото работ, рекомендации, дату следующего визита</li>
                  <li>Нажимает «Записаться» при надобности</li>
                  <li>Ведёт свою историю авто отдельно</li>
                </ul>
              </article>
            </div>
            <div className="pl-sides__note">
              История автомобиля переходит вместе с машиной — при продаже владелец передаёт
              всю историю обслуживания новому хозяину.
            </div>
          </FadeSection>

          {/* ——— 6 ЭКРАНОВ КЛИЕНТА ——— */}
          <FadeSection className="al-screens">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">Приложение клиента</span>
            </div>
            <h2 className="al-sectionTitle">
              6 экранов, что видит <b>владелец авто</b>
            </h2>
            <p className="al-sectionSub">
              Клиент видит фото, услуги и рекомендации — и сам нажимает «Записаться». Без звонков.
            </p>
            <div className="al-screensGrid">
              {clientScreens.map((s) => (
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
            <div className="al-screens__dl">
              <AppDownload title="Скачать приложение" />
            </div>
          </FadeSection>

          {/* ——— ПАНЕЛЬ СЕРВИСА ——— */}
          <FadeSection id="pl-business" className="pl-panel">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">Панель сервиса</span>
            </div>
            <h2 className="al-sectionTitle">
              Что видит <b>детейлинг или СТО</b>
            </h2>
            <p className="al-sectionSub">Все клиенты, авто и история — в одном месте.</p>
            <div className="al-showcase al-showcase--wide">
              <div className="al-showcase__text">
                <ul className="al-featureList">
                  {panelFeatures.map((f) => (
                    <li key={f.title}>
                      <b>{f.title}.</b> {f.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="al-frame">
                <div className="al-frame__bar" aria-hidden="true">
                  <span className="al-frame__dot" />
                  <span className="al-frame__dot" />
                  <span className="al-frame__dot" />
                </div>
                <img
                  className="al-frame__img"
                  src={crmPanelSrc}
                  alt="Панель сервиса КарПас: список клиентов и автомобилей с поиском и карточкой клиента"
                  loading="lazy"
                />
              </div>
            </div>
          </FadeSection>

          {/* ——— ПУБЛИЧНАЯ СТРАНИЦА В ПОДАРОК ——— */}
          <FadeSection className="pl-panel">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">Лендинг партнёра — в подарок</span>
            </div>
            <h2 className="al-sectionTitle">
              Публичная страница сервиса <b>сразу после подключения</b>
            </h2>
            <p className="al-sectionSub">
              Вам не нужен отдельный сайт — КарПас даёт готовую страницу, которую можно указать
              в соцсетях, на картах и в визитке.
            </p>
            <div className="al-showcase al-showcase--wide al-showcase--reverse">
              <div className="al-showcase__text">
                <ul className="al-featureList">
                  <li>
                    <b>Баннер, логотип и описание.</b> Ваш бренд и город — как на витрине.
                  </li>
                  <li>
                    <b>Услуги и режим работы.</b> Керамика, мойка, полировка, химчистка, PPF.
                  </li>
                  <li>
                    <b>Галерея фото работ.</b> Реальные примеры — клиент видит качество до визита.
                  </li>
                  <li>
                    <b>Кнопка «Позвонить» и контакты.</b> Сайт, Telegram, Instagram — клиент звонит в один тап.
                  </li>
                </ul>
              </div>
              <div className="al-frame">
                <div className="al-frame__bar" aria-hidden="true">
                  <span className="al-frame__dot" />
                  <span className="al-frame__dot" />
                  <span className="al-frame__dot" />
                </div>
                <img
                  className="al-frame__img"
                  src={partnerLandingSrc}
                  alt="Публичная страница детейлинг-студии в КарПас: услуги, фото работ и кнопка «Позвонить»"
                  loading="lazy"
                />
              </div>
            </div>
          </FadeSection>

          {/* ——— ЧТО ЭТО ДАЁТ БИЗНЕСУ ——— */}
          <FadeSection className="al-how">
            <h2 className="al-sectionTitle">
              Что это <b>даёт бизнесу</b>
            </h2>
            <p className="al-sectionSub">
              Качество услуг — ваша реклама. Клиент возвращается сам. Почему?
            </p>
            <div className="pl-valueGrid">
              {businessValue.map((v) => (
                <article className="pl-valueCard" key={v.n}>
                  <span className="pl-valueCard__num">{v.n}</span>
                  <div>
                    <h3 className="pl-valueCard__title">{v.title}</h3>
                    <p className="pl-valueCard__text">{v.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="pl-gift">
              <div className="pl-gift__badge">Первый месяц бесплатно</div>
              <p className="pl-gift__text">
                КарПас на этапе запуска — подключение бесплатное, помощь с настройкой включена.
                <b> Лендинг партнёра — в подарок.</b>
              </p>
            </div>
          </FadeSection>

          {/* ——— КАК НАЧАТЬ ——— */}
          <FadeSection className="al-timeline">
            <h2 className="al-sectionTitle">
              Как <b>внедрить</b>
            </h2>
            <p className="al-sectionSub">Три шага — и клиенты видят ваш сервис в истории своих авто.</p>
            <div className="al-how__list">
              <HowStep
                n="01"
                title="Зарегистрируйтесь на carpasss.ru"
                desc="Это бесплатно на этапе запуска — подключение и настройка публичной страницы включены."
                showStem
              />
              <HowStep
                n="02"
                title="Внесите первых 10 клиентов и их авто"
                desc="Карточка клиента, услуги и фото визита — запись с телефона или компьютера."
                showStem
              />
              <HowStep
                n="03"
                title="Покажите приложение клиенту"
                desc="Клиент видит историю, фото работ и кнопку «Записаться» — и возвращается сам."
                showStem={false}
              />
            </div>
          </FadeSection>

          {/* ——— ФИНАЛ: ДВЕ КНОПКИ ——— */}
          <FadeSection className="pl-final">
            <div className="al-final__line" aria-hidden />
            <h2 className="al-final__h2">
              КарПас растёт <b>вместе с вашим бизнесом</b>
            </h2>
            <p className="al-final__sub">
              Нужна особая функция или доработка под ваш сервис — говорите, сделаем.
            </p>
            <div className="pl-finalCtas">
              <div className="pl-finalCta">
                <span className="pl-finalCta__label">Владельцу авто</span>
                <Link to="/auth/owner" className="al-btnPrimarySolid">
                  Добавить авто
                </Link>
                <span className="pl-finalCta__note">
                  Уже есть аккаунт? <Link to="/auth">Войти</Link>
                </span>
              </div>
              <div className="pl-finalCta">
                <span className="pl-finalCta__label">Детейлингу и СТО</span>
                <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
                  Подключить сервис
                </Link>
                <span className="pl-finalCta__note">
                  Уже партнёр? <Link to="/auth/partner">Войти</Link> · <Link to="/business">Подробнее о CRM</Link>
                </span>
              </div>
            </div>
          </FadeSection>

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
