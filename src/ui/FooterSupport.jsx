import { Link } from 'react-router-dom'
import { SupportButton } from './support/SupportHub.jsx'
import Logo from './Logo.jsx'

/**
 * Футер: слева политика и правила, справа кнопка «Поддержка» (открывает тикет в админ-панель).
 */
export default function FooterSupport() {
  return (
    <div className="footer__bar">
      <div className="footerBrandSlot">
        <Link to="/" className="footerBrandSlot__link" aria-label="КарПас — главная страница сервиса">
          <Logo size={14} tagline={false} markWrapperClassName="brandLogoMarkAlign brandLogoMarkAlign--footer" />
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
        <SupportButton className="btn footerHelpDd__link" data-variant="outline">
          Поддержка
        </SupportButton>
      </div>
    </div>
  )
}
