import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'
import carPhotoSrc from '../assets/bmw.jpg?url'
import './AboutLanding.css'

function scrollToHowItWorks() {
  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function FadeSection({
  className,
  id,
  children,
}: {
  className?: string
  id?: string
  children: ReactNode
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.section>
  )
}

export default function AboutLanding() {
  return (
    <div className="aboutLanding">
      <nav className="al-nav">
        <div className="al-navInner">
          <Link to="/" className="al-nav__logoLink">
            <Logo tagline={false} size={24} />
          </Link>
          <div className="al-nav__actions">
            <Link to="/auth" className="al-nav__btnGhost">
              Войти
            </Link>
            <Link to="/auth/owner" className="al-nav__btnGold">
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

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
          </p>
          <div className="al-hero__ctaRow">
            <Link to="/auth/owner" className="al-btnPrimarySolid">
              Добавить автомобиль
            </Link>
            <button type="button" className="al-hero__scrollLink" onClick={scrollToHowItWorks}>
              Как это работает →
            </button>
          </div>
          <div className="al-hero__stats">
            <div>
              <div className="al-stat__val">
                <b>1</b> место
              </div>
              <div className="al-stat__label">Хранение истории</div>
            </div>
            <div>
              <div className="al-stat__val">
                <b>100%</b>
              </div>
              <div className="al-stat__label">Записей от детейлинга</div>
            </div>
            <div>
              <div className="al-stat__val">
                <b>∞</b>
              </div>
              <div className="al-stat__label">Лет хранения</div>
            </div>
          </div>
        </FadeSection>

        <FadeSection className="al-timeline">
          <h2 className="al-sectionTitle">
            Живая <b>биография</b>
          </h2>
          <p className="al-sectionSub">Каждый визит — новая запись. Детейлинг вносит, вы видите.</p>

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

        <FadeSection id="how-it-works" className="al-how">
          <h2 className="al-sectionTitle">
            Как это <b>работает</b>
          </h2>
          <p className="al-sectionSub">Три шага — и биография вашего авто под рукой.</p>
          <div className="al-how__list">
            <HowStep n="01" title="Добавьте автомобиль" desc="Укажите марку, модель и номер — и ваш гараж готов." showStem />
            <HowStep
              n="02"
              title="Детейлинг вносит запись"
              desc="После каждого визита мастер фиксирует что сделано — прозрачно и навсегда."
              showStem
            />
            <HowStep n="03" title="История остаётся с авто" desc="При продаже — поделитесь ссылкой. Покупатель увидит всё." showStem={false} />
          </div>
        </FadeSection>

        <FadeSection className="al-det">
          <div className="al-det__inner">
            <div className="al-det__eyebrow">Для детейлинга</div>
            <h2 className="al-det__title">Ведите клиентов прозрачно — они вернутся.</h2>
            <p className="al-det__sub">
              Каждая запись — это ваше портфолио. Клиент видит качество, доверяет и рекомендует.
            </p>
            <Link to="/auth/partner/apply" className="al-det__link">
              Стать партнёром →
            </Link>
          </div>
        </FadeSection>

        <FadeSection className="al-final">
          <div className="al-final__line" aria-hidden />
          <h2 className="al-final__h2">
            Начните вести <b>биографию своего авто.</b>
          </h2>
          <p className="al-final__sub">Бесплатно. Навсегда. С первого визита.</p>
          <Link to="/auth/owner" className="al-btnPrimarySolid">
            Добавить автомобиль
          </Link>
          <p className="al-final__note">
            Уже есть аккаунт?{' '}
            <Link to="/auth">Войти</Link>
          </p>
        </FadeSection>

        <footer className="al-footer">
          <Link to="/" className="al-footer__brand">
            <Logo tagline={false} size={14} />
          </Link>
          <div className="al-footer__links">
            <Link to="/">Условия</Link>
            <Link to="/">Конфиденциальность</Link>
            <Link to="/auth/partner">Партнёрам</Link>
          </div>
        </footer>
        </div>
      </div>
    </div>
  )
}

function HowStep({
  n,
  title,
  desc,
  showStem,
}: {
  n: string
  title: string
  desc: string
  showStem: boolean
}) {
  return (
    <div className="al-step">
      <div className="al-step__rail">
        <span className="al-step__num">{n}</span>
        {showStem ? <span className="al-step__stem" aria-hidden /> : null}
      </div>
      <div className="al-step__body">
        <h3 className="al-step__title">{title}</h3>
        <p className="al-step__desc">{desc}</p>
      </div>
    </div>
  )
}

function TimelineItem({
  index,
  active,
  hasStem,
  muted,
  date,
  name,
  badge,
  text,
  footerLeft,
  footerRight,
}: {
  index: number
  active: boolean
  hasStem: boolean
  muted?: boolean
  date: string
  name: string
  badge: string
  text: string
  footerLeft?: ReactNode
  footerRight?: string
}) {
  return (
    <motion.div
      className={`al-tlItem${muted ? ' al-tlItem--faded' : ''}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      viewport={{ once: true }}
    >
      <div className="al-tlItem__rail">
        <span className={`al-tlItem__dot${active ? ' al-tlItem__dot--gold' : ' al-tlItem__dot--muted'}`} />
        {hasStem ? <span className="al-tlItem__stem" aria-hidden /> : null}
      </div>
      <div>
        <div className={`al-tlItem__date${active ? ' al-tlItem__date--gold' : ' al-tlItem__date--muted'}`}>{date}</div>
        <div className="al-tlCard">
          <div className="al-tlCard__top">
            <span className="al-tlCard__name">{name}</span>
            <span className="al-tlCard__badge">{badge}</span>
          </div>
          <p className="al-tlCard__text">{text}</p>
          {footerLeft != null && footerRight != null ? (
            <div className="al-tlCard__foot">
              <span className="al-tlCard__master">{footerLeft}</span>
              <span className="al-tlCard__status">{footerRight}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
