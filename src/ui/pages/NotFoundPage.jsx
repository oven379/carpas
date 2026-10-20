import { Link } from 'react-router-dom'
import { Card } from '../components.jsx'
import { Seo } from '../../seo/Seo.jsx'

/**
 * Несуществующий адрес. Раньше любой неизвестный URL молча редиректил на главную — для поисковиков это soft-404
 * (дубль главной под произвольным адресом). Теперь показываем понятную страницу с noindex и ссылками на разделы.
 */
export default function NotFoundPage() {
  return (
    <div className="container">
      <Seo title="Страница не найдена · КарПас" description="Такой страницы нет. Перейдите на главную КарПас." noindex />
      <Card className="card pad" style={{ maxWidth: 640, margin: '32px auto' }}>
        <h1 className="h1" style={{ marginTop: 0 }}>
          Страница не найдена
        </h1>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Возможно, ссылка устарела или в адресе опечатка. Вот куда можно перейти:
        </p>
        <div className="row gap wrap" style={{ marginTop: 16 }}>
          <Link className="btn" data-variant="primary" to="/">
            На главную
          </Link>
          <Link className="btn" data-variant="ghost" to="/owners">
            Владельцам авто
          </Link>
          <Link className="btn" data-variant="ghost" to="/business">
            Сервисам и бизнесу
          </Link>
          <Link className="btn" data-variant="ghost" to="/blog">
            Блог
          </Link>
        </div>
      </Card>
    </div>
  )
}
