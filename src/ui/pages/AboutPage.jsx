import { Helmet } from 'react-helmet-async'
import { useMemo } from 'react'
import AboutLanding from '../../about-landing/AboutLanding.tsx'
import { Seo } from '../../seo/Seo.jsx'
import { HOME_META_DESCRIPTION, HOME_TITLE } from '../../seo/seoConstants.js'
import { buildHomePageJsonLd } from '../../seo/homePageJsonLd.js'

export default function AboutPage() {
  const homeJsonLd = useMemo(() => buildHomePageJsonLd(), [])

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <Seo title={HOME_TITLE} description={HOME_META_DESCRIPTION} canonicalPath="/about" jsonLd={homeJsonLd} />
      <AboutLanding />
    </>
  )
}
