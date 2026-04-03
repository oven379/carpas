import { Link, useMatch } from 'react-router-dom'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

/**
 * В футере: текстовые ссылки на политику и правила (как на /auth/owner), плюс «Поддержка».
 * На странице истории авто кнопка «Поддержка» скрыта — поддержка в шапке; ссылки на /about остаются.
 */
export default function FooterSupport() {
  const onCarHistory = useMatch({ path: '/car/:id/history', end: true })

  return (
    <>
      <nav className="footerLegal" aria-label="Правовая информация">
        <Link className="authConsent__legalLink" to="/about">
          Политика конфиденциальности
        </Link>
        <span className="footerLegal__sep" aria-hidden="true">
          ·
        </span>
        <Link className="authConsent__legalLink" to="/about">
          Согласие с правилами сервиса
        </Link>
      </nav>
      {!onCarHistory ? (
        <div className="footerHelpDd">
          <a
            className="btn footerHelpDd__link"
            data-variant="outline"
            href={SUPPORT_LINK_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            Поддержка
          </a>
        </div>
      ) : null}
    </>
  )
}
