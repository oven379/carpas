import { Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'
import { LandingAuthLink } from './LandingAuthLink.tsx'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `al-nav__link${isActive ? ' al-nav__link--active' : ''}`

export function LandingNav({ sections }: { sections?: readonly { id: string; label: string }[] } = {}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    document.getElementById(menuId)?.querySelector('a')?.focus({ preventScroll: true })

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) setMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [menuId, menuOpen])

  return (
    <>
      <nav
        ref={navRef}
        className="al-nav"
        aria-label="Основная навигация"
        onKeyDown={event => {
          if (event.key === 'Escape' && menuOpen) {
            setMenuOpen(false)
            toggleRef.current?.focus()
          }
        }}
        onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
        }}
      >
        <div className="al-navInner">
          <Link to="/" className="al-nav__logoLink">
            <Logo tagline={false} size={sections ? 29 : 22} />
          </Link>
          <div id={sections ? menuId : undefined} className={`al-nav__links${menuOpen ? ' al-nav__links--open' : ''}`}>
            {sections ? sections.map(({ id, label }) => (
              <a key={id} href={`#${id}`} className="al-nav__link" onClick={() => setMenuOpen(false)}>{label}</a>
            )) : <>
              <NavLink to="/" end className={navLinkClass}>
                О сервисе
              </NavLink>
              <NavLink to="/owners" className={navLinkClass}>
                Владельцам
              </NavLink>
              <NavLink to="/business" className={navLinkClass}>
                Бизнесу
              </NavLink>
              <NavLink to="/blog" className={navLinkClass}>
                Блог
              </NavLink>
            </>}
          </div>
          <div className="al-nav__actions">
            <LandingAuthLink className="al-nav__btnGhost" onOpen={() => setMenuOpen(false)}>
              Войти
            </LandingAuthLink>
            <LandingAuthLink mode="register" className="al-nav__btnGold" onOpen={() => setMenuOpen(false)}>
              Регистрация
            </LandingAuthLink>
            {sections && (
              <button
                ref={toggleRef}
                type="button"
                className="al-nav__menuToggle"
                aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen(open => !open)}
              >
                {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
