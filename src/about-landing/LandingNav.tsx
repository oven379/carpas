import { Link } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'

export function LandingNav() {
  return (
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
  )
}
