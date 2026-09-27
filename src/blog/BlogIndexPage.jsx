import { Link } from 'react-router-dom'
import { Seo } from '../seo/Seo.jsx'
import { buildBreadcrumbJsonLd } from '../seo/marketingJsonLd.js'
import { LandingNav } from '../about-landing/LandingNav.tsx'
import { LandingFooter } from '../about-landing/LandingFooter.tsx'
import { blogPosts } from './posts.jsx'
import '../about-landing/AboutLanding.css'
import './Blog.css'

const title = 'Блог КарПас — история авто, сервисная книжка и CRM для сервисов'
const description =
  'Статьи КарПас: как вести историю обслуживания авто, что такое электронная сервисная книжка, как выбрать программу для автосервиса и CRM для детейлинга.'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function BlogIndexPage() {
  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Блог', path: '/blog' },
    ]),
  ]

  return (
    <div className="aboutLanding">
      <Seo title={title} description={description} canonicalPath="/blog" jsonLd={jsonLd} />
      <LandingNav />

      <div className="al-main">
        <div className="al-shell">
          <section className="blogHead">
            <div className="al-eyebrow">
              <span className="al-eyebrow__text">Блог</span>
            </div>
            <h1 className="al-hero__h1">Блог КарПас</h1>
            <p className="al-hero__sub">
              Как вести историю обслуживания авто, что такое электронная сервисная книжка и как выбрать программу для
              автосервиса.
            </p>
          </section>

          <section className="blogList">
            {blogPosts.map((post) => (
              <article className="blogCard" key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="blogCard__link">
                  <h2 className="blogCard__title">{post.title}</h2>
                  <p className="blogCard__desc">{post.description}</p>
                  <span className="blogCard__meta">
                    {formatDate(post.datePublished)} · Читать →
                  </span>
                </Link>
              </article>
            ))}
          </section>

          <LandingFooter />
        </div>
      </div>
    </div>
  )
}
