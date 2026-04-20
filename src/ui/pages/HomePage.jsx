import { Navigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Seo } from '../../seo/Seo.jsx'
import { HOME_META_DESCRIPTION, HOME_TITLE } from '../../seo/seoConstants.js'
import { buildHomePageJsonLd } from '../../seo/homePageJsonLd.js'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import HomeLuxuryHero from './HomeLuxuryHero.jsx'

export default function HomePage() {
  const { detailing } = useDetailing()
  const homeJsonLd = useMemo(() => buildHomePageJsonLd(), [])
  const seoDesc = truncateMetaDescription(HOME_META_DESCRIPTION)

  if (hasOwnerSession()) return <Navigate to="/garage" replace />
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <>
      <Seo title={HOME_TITLE} description={seoDesc} canonicalPath="/" jsonLd={homeJsonLd} />
      <h1 className="srOnly">{HOME_TITLE}</h1>
      <HomeLuxuryHero />
    </>
  )
}
