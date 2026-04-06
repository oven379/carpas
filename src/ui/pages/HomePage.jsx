import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PHOTO_LANDSCAPE_HINT_SENTENCE } from '../../lib/historyVisitHints.js'
import { useRepo } from '../useRepo.js'
import { Card, PageLoadSpinner, Pill } from '../components.jsx'
import { fmtInt } from '../../lib/format.js'

export default function HomePage() {
  const r = useRepo()
  const [total, setTotal] = useState(0)
  const [top, setTop] = useState([])
  const [bootReady, setBootReady] = useState(false)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        try {
          const st = await r.publicStats()
          if (!c) setTotal(Number(st?.cars) || 0)
        } catch {
          if (!c) setTotal(0)
        }
        try {
          const recent = await r.publicCarsRecent({ limit: 6 })
          if (!c) setTop(Array.isArray(recent) ? recent.slice(0, 3) : [])
        } catch {
          if (!c) setTop([])
        }
      } finally {
        if (!c) setBootReady(true)
      }
    })()
    return () => {
      c = true
    }
  }, [r, r._version])

  if (!bootReady) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '48px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="hero2">
        <div>
          <h1 className="h1">КарПас — подтверждённая история авто</h1>
          <p className="muted">
            История работ по вашему авто в одном месте: что сделали, на каком пробеге, с
            фото/документами. Можно быстро показать историю по публичной ссылке — без доступа к
            личному кабинету.
          </p>
          <div className="row gap">
            <Link className="btn" data-variant="primary" to="/cars">
              Мои автомобили
            </Link>
            <Link className="btn" data-variant="ghost" to="/auth/partner">
              Партнёрам
            </Link>
          </div>
          <div className="row gap wrap" style={{ marginTop: 12 }}>
            <Pill>история по визитам</Pill>
            <Pill>публичная ссылка</Pill>
            <Pill>для детейлингов и СТО</Pill>
          </div>
        </div>
        <Card className="kpi">
          <div className="kpi__row">
            <span className="kpi__label">Авто</span>
            <span className="kpi__value">{fmtInt(total)}</span>
          </div>
          <div className="kpi__row">
            <span className="kpi__label">Для кого</span>
            <span className="kpi__value">
              <Pill tone="accent">владельцы и сервисы</Pill>
            </span>
          </div>
        </Card>
      </div>

      <section className="section">
        <h2 className="h2">Что даёт КарПас</h2>
        <div className="cards3">
          <Card className="card pad">
            <div className="cardTitle">Прозрачная история</div>
            <p className="muted small">
              Все визиты в сервис в одном месте: что сделали, на каком пробеге, какие рекомендации.
            </p>
          </Card>
          <Card className="card pad">
            <div className="cardTitle">Материалы к истории</div>
            <p className="muted small">
              Фото «до/после», акты и вложения к визитам. Личные документы в гараже по публичной ссылке не показываются.{' '}
              {PHOTO_LANDSCAPE_HINT_SENTENCE}
            </p>
          </Card>
          <Card className="card pad">
            <div className="cardTitle">Публичная ссылка</div>
            <p className="muted small">
              Отправьте ссылку покупателю или партнёру — он увидит историю без доступа к кабинету.
            </p>
          </Card>
        </div>
      </section>

      <section className="section">
        <h2 className="h2">Как это работает</h2>
        <div className="steps">
          <Card className="card pad">
            <div className="stepNum">01</div>
            <div className="cardTitle">Добавляете авто в гараж</div>
            <p className="muted small">
              Создайте карточку авто и храните историю обслуживания в одном месте.
            </p>
          </Card>
          <Card className="card pad">
            <div className="stepNum">02</div>
            <div className="cardTitle">Сервисы фиксируют визиты</div>
            <p className="muted small">
              Детейлинг/СТО добавляет работы, пробег, фото и рекомендации — история становится
              «подтверждённой». {PHOTO_LANDSCAPE_HINT_SENTENCE}
            </p>
          </Card>
          <Card className="card pad">
            <div className="stepNum">03</div>
            <div className="cardTitle">Делитесь ссылкой при необходимости</div>
            <p className="muted small">
              Получатель открывает публичную страницу и читает историю без доступа к кабинету детейлинга.
            </p>
          </Card>
          <Card className="card pad">
            <div className="stepNum">04</div>
            <div className="cardTitle">Сервисы получают инструмент</div>
            <p className="muted small">
              Партнёры ведут историю работ и повышают доверие клиентов за счёт прозрачности.
            </p>
          </Card>
        </div>
      </section>

      <section className="section">
        <div className="row spread gap">
          <h2 className="h2">Быстрый доступ</h2>
          <Link className="link" to="/cars">
            все авто →
          </Link>
        </div>
        <div className="grid">
          {top.map((c) => (
            <Link key={c.id} className="tile" to={`/car/${c.id}`}>
              <div
                className="tile__media"
                style={c.hero ? { backgroundImage: `url("${String(c.hero).replaceAll('"', '%22')}")` } : undefined}
              />
              <div className="tile__body">
                <div className="tile__title">
                  {c.make} {c.model}
                </div>
                <div className="tile__meta">
                  {c.year} · {c.city || '—'}
                </div>
              </div>
            </Link>
          ))}
          <Link className="tile tile--add" to="/create">
            <div className="tile__body">
              <div className="tile__title">+ Добавить авто</div>
              <div className="tile__meta">создать карточку авто</div>
            </div>
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="h2">Часто задаваемые вопросы</h2>
        <div className="faq">
          <details className="faqItem">
            <summary>Покупатель увидит всё про меня?</summary>
            <div className="faqBody muted small">
              Нет. Публичная ссылка предназначена для истории авто. Пароль и данные кабинета детейлинга не раскрываются.
            </div>
          </details>
          <details className="faqItem">
            <summary>Что именно фиксируется при визите?</summary>
            <div className="faqBody muted small">
              Дата/время, пробег, перечень работ (мойка/осмотр/полировка и т.д.), заметки, а также
              фото/документы при необходимости.
            </div>
          </details>
          <details className="faqItem">
            <summary>Можно ли отозвать публичную ссылку?</summary>
            <div className="faqBody muted small">
              Да: ссылку можно отозвать в кабинете или выпустить новую — по старой ссылке войти уже не получится.
            </div>
          </details>
        </div>
      </section>
    </div>
  )
}
