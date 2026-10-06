import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export const metadata: Metadata = pageMetadata({
  title: 'Biomedical Engineering Services in Kenya | Accord Medical',
  description:
    'Installation, calibration and maintenance of medical equipment from Accord Medical Supplies. Biomedical engineering support for hospitals and clinics in Kenya.',
  path: ROUTES.biomedical,
  absoluteTitle: true,
})

const work = [
  {
    title: 'Installation and commissioning',
    copy: 'Theatre, laboratory, imaging and maternity equipment is unpacked, positioned and commissioned with the facility team before handover.',
  },
  {
    title: 'Calibration and preventive maintenance',
    copy: 'Scheduled service keeps analysers, monitors and ward equipment in use. Facilities request this alongside new purchases or for equipment already on the floor.',
  },
  {
    title: 'Training',
    copy: 'Operators receive practical training on newly installed equipment so the department is not waiting on a later visit.',
  },
]

export default function BiomedicalServicesPage() {
  return (
    <main className="min-h-screen">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Biomedical engineering services',
          provider: { '@id': `${COMPANY.url}/#organization` },
          areaServed: { '@type': 'Country', name: 'Kenya' },
          serviceType: 'Medical equipment installation, calibration and maintenance',
          url: `${COMPANY.url}${ROUTES.biomedical}`,
        }}
      />
      <SiteHeader />
      <section className="shell section about-page">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Biomedical engineering services', path: ROUTES.biomedical }]} />
        <span className="kicker">After-sales support</span>
        <h1 className="page-title">Biomedical engineering <em>services.</em></h1>
        <p className="hero-lede">
          Accord Medical Supplies installs, calibrates and maintains medical equipment for hospitals and clinics in
          Kenya. The same team that supplies laboratory, theatre and maternity equipment supports it after delivery.
        </p>
        <h2 className="section-subhead">How we support facilities</h2>
        <div className="post-grid about-services">
          {work.map((item) => (
            <article className="post-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        <h2 className="section-subhead">Talk to the service team</h2>
        <p className="hero-lede">
          Call {COMPANY.phone} or write to {COMPANY.email}. Describe the equipment, the facility location and whether
          you need installation, a service visit or training.
        </p>
        <div className="about-actions">
          <Link href={ROUTES.contact} className="button button-primary">Contact biomedical services</Link>
          <Link href={ROUTES.projects} className="button button-outline">See recent projects</Link>
          <Link href={ROUTES.products} className="button button-outline">Browse equipment</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
