import { Link } from 'react-router-dom'
import { SupportButton } from './support/SupportHub.jsx'

export default function FooterSupport() {
  return (
    <div className="footer__bar">
      <nav className="footerLegal" aria-label="Правовая информация">
        <Link className="footerLegal__link" to="/policy">
          Политика конфиденциальности
        </Link>
        <span className="footerLegal__sep" aria-hidden="true">
          ·
        </span>
        <Link className="footerLegal__link" to="/terms">
          Условия использования
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
        <SupportButton className="btn footerHelpDd__link" data-variant="outline" />
      </div>
    </div>
  )
}
