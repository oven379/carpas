import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../Logo.jsx'
import './DetOfferPage.css'

const MotionDiv = motion.div

function FadeIn({ children, className }) {
  return (
    <MotionDiv
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      viewport={{ once: true, amount: 0.1 }}
    >
      {children}
    </MotionDiv>
  )
}

function Feature({ name, desc }) {
  return (
    <div className="do-feature">
      <div className="do-feature__name">{name}</div>
      <p className="do-feature__desc">{desc}</p>
    </div>
  )
}

export default function DetOfferPage() {
  return (
    <div className="detOffer">
      <nav className="do-nav">
        <div className="do-navInner">
          <Link to="/" className="do-nav__logo">
            <Logo tagline={false} size={24} />
          </Link>
          <div className="do-nav__actions">
            <Link to="/auth/partner" className="do-nav__ghost">Войти</Link>
            <Link to="/auth/partner/apply" className="do-nav__gold">Подать заявку</Link>
          </div>
        </div>
      </nav>

      <div className="do-main">
        <div className="do-shell">

          <FadeIn className="do-hero">
            <div className="do-eyebrow">
              <span className="do-eyebrow__text">Для детейлинг-студий</span>
            </div>
            <h1 className="do-hero__h1">
              Ваша работа остаётся<br /><b>с автомобилем.</b>
            </h1>
            <p className="do-hero__sub">
              КарПас фиксирует каждый визит в цифровой истории авто — с вашим логотипом, перечнем работ и фото. Клиент видит это в приложении, покупатель — по ссылке.
            </p>
            <Link to="/auth/partner/apply" className="do-btn">
              Подать заявку
            </Link>
          </FadeIn>

          <FadeIn className="do-why">
            <div className="do-eyebrow">
              <span className="do-eyebrow__text">Зачем это нужно</span>
            </div>
            <p className="do-why__text">
              Детейлинг выполняет работу высокого уровня — но клиент её забывает, следующий мастер о ней не знает, а при продаже автомобиля она нигде не подтверждена. КарПас делает работу студии видимой: постоянно, структурированно, с вашим именем.
            </p>
            <p className="do-why__text">
              Записи от студии нельзя изменить или удалить задним числом — это подтверждение качества, а не просто архив.
            </p>
          </FadeIn>

          <FadeIn className="do-features">
            <div className="do-label">Возможности</div>
            <div className="do-grid">
              <Feature
                name="База клиентов"
                desc="Карточки авто с VIN, госномером, пробегом и контактами. Поиск при повторном визите — за несколько секунд."
              />
              <Feature
                name="Подтверждённые визиты"
                desc="Услуги, пробег, фото, рекомендации по уходу. Записи защищены от изменений задним числом."
              />
              <Feature
                name="Публичная страница студии"
                desc="Профиль с описанием, услугами и часами работы по адресу carpas.ru/d/название."
              />
              <Feature
                name="Push-уведомления"
                desc="Прямое обращение к клиенту в приложение — напоминания о сезонных работах или актуальных предложениях."
              />
              <Feature
                name="Заявки по VIN"
                desc="Владелец находит своё авто в сервисе и запрашивает доступ к истории. Вы подтверждаете каждую заявку."
              />
            </div>
          </FadeIn>

          <FadeIn className="do-pricing">
            <div className="do-label">Условия</div>
            <div className="do-pricing__cols">
              <div className="do-pricing__col do-pricing__col--pilot">
                <div className="do-pricing__colLabel">Пилотный период</div>
                <div className="do-pricing__price">Бесплатно</div>
                <p className="do-pricing__note">
                  Пока сервис проходит финальное тестирование — полный доступ без оплаты. Студии-участники фиксируют стоимость перехода без пересмотра.
                </p>
                <div className="do-pricing__limit">До 50 автомобилей · визиты без ограничений</div>
              </div>
              <div className="do-pricing__col">
                <div className="do-pricing__colLabel">После запуска</div>
                <div className="do-pricing__price">
                  3 000 <small>₽ / мес</small>
                </div>
                <p className="do-pricing__note">
                  Фиксированная стоимость для участников пилота — без повышений.
                </p>
                <div className="do-pricing__limit">До 50 автомобилей · визиты без ограничений</div>
              </div>
            </div>
          </FadeIn>

          <FadeIn className="do-cta">
            <div className="do-cta__line" aria-hidden />
            <h2 className="do-cta__title">Подключить студию</h2>
            <p className="do-cta__sub">
              Заявка займёт несколько минут. После проверки откроется кабинет детейлинга.
            </p>
            <Link to="/auth/partner/apply" className="do-btn">
              Подать заявку
            </Link>
            <div className="do-cta__contacts">
              <a
                href="https://t.me/sachkaprog"
                className="do-cta__contact"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
              <span className="do-cta__sep" aria-hidden>·</span>
              <a href="mailto:sachkaprog@gmail.com" className="do-cta__contact">
                sachkaprog@gmail.com
              </a>
            </div>
          </FadeIn>

          <footer className="do-footer">
            <Link to="/" className="do-footer__brand">
              <Logo tagline={false} size={14} />
            </Link>
            <div className="do-footer__links">
              <Link to="/terms">Условия</Link>
              <Link to="/policy">Конфиденциальность</Link>
              <Link to="/auth/partner">Вход партнёра</Link>
            </div>
          </footer>

        </div>
      </div>
    </div>
  )
}
