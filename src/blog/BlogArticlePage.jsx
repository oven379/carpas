import { Link, Navigate, useParams } from 'react-router-dom'
import { Seo } from '../seo/Seo.jsx'
import { buildBreadcrumbJsonLd } from '../seo/marketingJsonLd.js'
import { buildArticleJsonLd } from './blogJsonLd.js'
import { LandingNav } from '../about-landing/LandingNav.tsx'
import { LandingFooter } from '../about-landing/LandingFooter.tsx'
import { AppDownload } from '../about-landing/AppDownload.tsx'
import { getPostBySlug, blogPosts } from './posts.jsx'
import '../about-landing/AboutLanding.css'
import './Blog.css'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function BlogArticlePage() {
  const { slug } = useParams()
  const post = getPostBySlug(slug)

  if (!post) return <Navigate to="/blog" replace />

  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Блог', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    buildArticleJsonLd(post),
  ]

  const others = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2)
  const Body = post.Body

  return (
    <div className="aboutLanding">
      <Seo
        title={`${post.title} — КарПас`}
        description={post.description}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        jsonLd={jsonLd}
      />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          <article className="blogArticle">
            <nav className="blogCrumbs" aria-label="Хлебные крошки">
              <Link to="/">Главная</Link> · <Link to="/blog">Блог</Link>
            </nav>
            <h1 className="blogArticle__title">{post.title}</h1>
            <p className="blogArticle__meta">{formatDate(post.datePublished)}</p>
            <div className="blogArticle__body">
              <Body />
            </div>

            <aside className="blogCta">
              {post.cta === 'business' ? (
                <>
                  <h2 className="blogCta__title">Подключите сервис к КарПас</h2>
                  <p className="blogCta__sub">
                    На этапе запуска бесплатно — с настройкой и публичным лендингом в подарок.
                  </p>
                  <div className="blogCta__row">
                    <Link to="/auth/partner/apply" className="al-btnPrimarySolid">
                      Подключить сервис
                    </Link>
                    <Link to="/business" className="al-btnOutline">
                      Подробнее о CRM
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="blogCta__title">Заведите электронную сервисную книжку</h2>
                  <p className="blogCta__sub">
                    Бесплатно. Вся история обслуживания авто — всегда в телефоне.
                  </p>
                  <div className="blogCta__row">
                    <Link to="/auth/owner" className="al-btnPrimarySolid">
                      Добавить авто
                    </Link>
                    <Link to="/owners" className="al-btnOutline">
                      Как это работает
                    </Link>
                  </div>
                </>
              )}
              <AppDownload title="Скачать приложение" />
            </aside>
          </article>

          {others.length > 0 && (
            <section className="blogMore">
              <h2 className="al-sectionTitle">Читайте также</h2>
              <div className="blogList">
                {others.map((p) => (
                  <article className="blogCard" key={p.slug}>
                    <Link to={`/blog/${p.slug}`} className="blogCard__link">
                      <h3 className="blogCard__title">{p.title}</h3>
                      <p className="blogCard__desc">{p.description}</p>
                      <span className="blogCard__meta">Читать →</span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
