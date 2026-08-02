import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { SUPPORT_LINK_HREF } from '../ui/supportConfig.js'

export function LandingFooter() {
  return (
    <footer className="al-footer">
      <Link to="/" className="al-footer__brand">
        <Logo tagline={false} size={14} />
      </Link>
      <div className="al-footer__links">
        <Link to="/terms">Условия</Link>
        <Link to="/policy">Конфиденциальность</Link>
        <Link to="/auth/partner">Партнёрам</Link>
      </div>
      <a
        href={SUPPORT_LINK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="al-footer__telegram"
      >
        <Send size={13} aria-hidden="true" />
        Написать в Telegram
      </a>
    </footer>
  )
}
