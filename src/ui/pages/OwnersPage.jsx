import { useMemo } from 'react'
import { Seo } from '../../seo/Seo.jsx'
import { OWNERS_TITLE, OWNERS_META_DESCRIPTION } from '../../seo/seoConstants.js'
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildSoftwareJsonLd } from '../../seo/marketingJsonLd.js'
import { truncateMetaDescription } from '../../seo/seoUtils.js'
import AboutLanding, { ownerFaqItems } from '../../about-landing/AboutLanding.tsx'

// Лендинг для владельцев авто. Живёт на /owners; главная (/) — обзор сервиса.
export default function OwnersPage() {
  const jsonLd = useMemo(
    () => [
      buildBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: 'Владельцам авто', path: '/owners' },
      ]),
      buildSoftwareJsonLd({
        path: '/owners',
        name: 'КарПас — история обслуживания авто',
        description: OWNERS_META_DESCRIPTION,
        audience: 'Владельцы автомобилей',
      }),
      buildFaqJsonLd(ownerFaqItems),
    ],
    [],
  )
  const seoDesc = truncateMetaDescription(OWNERS_META_DESCRIPTION)

  return (
    <>
      <Seo title={OWNERS_TITLE} description={seoDesc} canonicalPath="/owners" jsonLd={jsonLd} />
      <AboutLanding />
    </>
  )
}
