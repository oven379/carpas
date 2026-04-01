import { useMatch } from 'react-router-dom'
import { SUPPORT_LINK_HREF } from './supportConfig.js'

/**
 * В футере простая ссылка «Поддержка» (выпадающее меню — в шапке у владельца).
 * На странице истории авто в футере кнопка не показывается — поддержка в шапке.
 */
export default function FooterSupport() {
  const onCarHistory = useMatch({ path: '/car/:id/history', end: true })
  if (onCarHistory) return null

  return (
    <div className="footerHelpDd">
      <a
        className="btn footerHelpDd__link"
        data-variant="outline"
        href={SUPPORT_LINK_HREF}
        target="_blank"
        rel="noopener noreferrer"
      >
        Поддержка
      </a>
    </div>
  )
}
