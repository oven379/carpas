import { Link, useLocation } from 'react-router-dom'
import { useDetailing } from './useDetailing.js'
import { isAuthed } from './auth.js'
import OwnerSupportDropdown from './OwnerSupportDropdown.jsx'
import { SupportButton } from './support/SupportHub.jsx'
import Logo from './Logo.jsx'

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
      <div className="footerBrandSlot">
        <Link to="/" className="footerBrandSlot__link" aria-label="КарПас — главная страница сервиса">
          <Logo size={14} markWrapperClassName="brandLogoMarkAlign brandLogoMarkAlign--footer" />
        </Link>
      </div>
      <nav className="footerLegal" aria-label="Правовая информация">
        <Link className="authConsent__legalLink" to="/">
          Политика конфиденциальности
        </Link>
        <span className="footerLegal__sep" aria-hidden="true">
          ·
        </span>
        <Link className="authConsent__legalLink" to="/">
          Согласие с правилами сервиса
        </Link>
        {__APP_VERSION__ ? (
          <>
            <span className="footerLegal__sep" aria-hidden="true">
              ·
            </span>
            <span className="muted small" style={{ whiteSpace: 'nowrap' }}>
              Версия {__APP_VERSION__}
            </span>
          </>
        ) : null}
      </nav>
      <div className="footerSupportSlot">
        {footerSupportMenu ? (
          <OwnerSupportDropdown placement="footer" />
        ) : (
          <SupportButton className="btn footerHelpDd__link" data-variant="outline">
            Поддержка
          </SupportButton>
        )}
      </div>
    </div>
  )
}
