import { Link } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'

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
    </footer>
  )
}
