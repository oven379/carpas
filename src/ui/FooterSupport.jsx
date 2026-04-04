import { Link, useLocation } from 'react-router-dom'
import { useDetailing } from './useDetailing.js'
import { isAuthed } from './auth.js'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

function isOwnerGarageRoute(pathname) {
  return pathname === '/garage' || pathname === '/garage/settings'
}

/**
 * Футер: слева политика и правила, справа кнопка «Поддержка» (outline).
 * Выпадающее меню — только на страницах гаража владельца; везде иначе — ссылка на поддержку.
 */
export default function FooterSupport() {
  const { mode } = useDetailing()
  const { pathname } = useLocation()
  const footerSupportMenu =
    mode === 'owner' && isAuthed() && isOwnerGarageRoute(pathname)

  return (
    <div className="footer__bar">
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
      <div className="footerSupportSlot">
        {footerSupportMenu ? (
          <OwnerSupportDropdown placement="footer" />
        ) : (
          <a
            className="btn footerHelpDd__link"
            data-variant="outline"
            href={SUPPORT_LINK_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            Поддержка
          </a>
        )}
      </div>
    </div>
  )
}
