import { useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'carpas_cookie_ok'

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY)
    } catch {
      return false
    }
  })

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setVisible(false)
  }

  return (
    <div className="cookieBanner" role="region" aria-label="Cookie-уведомление">
      <p className="cookieBanner__text">
        Мы используем файлы cookie для улучшения работы сайта, аналитики и показа рекламы. Продолжая использовать сайт, вы соглашаетесь с нашей{' '}
        <Link className="cookieBanner__link" to="/policy">
          Политикой конфиденциальности в отношении cookie
        </Link>
        .
      </p>
      <button type="button" className="btn cookieBanner__btn" onClick={accept}>
        Понятно
      </button>
    </div>
  )
}
