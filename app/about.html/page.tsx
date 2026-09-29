import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CompanyProfileBook } from '@/components/company-profile-book'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'
import { listCompanyProfilePages } from '@/lib/site-data'
import { defaultCompanyProfilePages } from '@/lib/profile'

const services = [
  { title: 'Procurement', copy: 'Source medical equipment, laboratory supplies, and clinical consumables for hospitals and clinics.' },
  { title: 'Installation', copy: 'Commission theatre, laboratory, and diagnostic equipment with trained technical support.' },
  { title: 'Calibration & maintenance', copy: 'Preventive maintenance and after-sales service so facilities stay operational.' },
  { title: 'Training', copy: 'Staff training on newly installed equipment so teams can use it safely and confidently.' },
]

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const stored = await listCompanyProfilePages(true).catch(() => [])
  const profile = stored.length ? stored : defaultCompanyProfilePages()

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section about-page">
        <span className="kicker">Who we are</span>
        <h1 className="page-title">About <em>{COMPANY.shortName}.</em></h1>
        <CompanyProfileBook pages={profile} />
        <div className="post-grid about-services">
          {services.map((service) => (
            <article className="post-card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
            </article>
          ))}
        </div>
        <div className="about-actions">
          <Link href={ROUTES.products} className="button button-primary">Browse products</Link>
          <Link href={ROUTES.contact} className="button button-outline">Talk to us</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
