import { Link, NavLink } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `al-nav__link${isActive ? ' al-nav__link--active' : ''}`

export function LandingNav() {
  return (
    <nav className="al-nav">
      <div className="al-navInner">
        <Link to="/" className="al-nav__logoLink">
          <Logo tagline={false} size={24} />
        </Link>
        <div className="al-nav__links">
          <NavLink to="/" end className={navLinkClass}>
            Владельцам
          </NavLink>
          <NavLink to="/business" className={navLinkClass}>
            Бизнесу
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            О сервисе
          </NavLink>
        </div>
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
