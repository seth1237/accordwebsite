import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CompanyProfileBook } from '@/components/company-profile-book'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { ROUTES } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo'
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

export const metadata: Metadata = pageMetadata({
  title: 'About Accord Medical Supplies | Equipment Supplier, Eldoret & Nairobi',
  description:
    'Accord Medical Supplies Ltd is a Kenyan medical equipment supplier with an Eldoret office and Nairobi warehouse. We supply hospitals and clinics — we are not Accord Healthcare pharmaceuticals.',
  path: ROUTES.about,
  absoluteTitle: true,
})

export default async function AboutPage() {
  const stored = await listCompanyProfilePages(true).catch(() => [])
  const profile = stored.length ? stored : defaultCompanyProfilePages()

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section about-page">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'About', path: ROUTES.about }]} />
        <span className="kicker">Who we are</span>
        <h1 className="page-title">About <em>{COMPANY.shortName}.</em></h1>
        <p className="hero-lede">
          {COMPANY.name} supplies medical equipment and laboratory products to hospitals and clinics in Kenya.
          The sales office is in Eldoret; the warehouse is on Baba Dogo Road in Nairobi.
        </p>
        <CompanyProfileBook pages={profile} />
        <h2 className="section-subhead">What we do</h2>
        <div className="post-grid about-services">
          {services.map((service) => (
            <article className="post-card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
            </article>
          ))}
        </div>
        <h2 className="section-subhead">Where to find us</h2>
        <p className="hero-lede">
          Eldoret office: {COMPANY.location}. Nairobi warehouse: {COMPANY.warehouse}. For installation and
          after-sales work see biomedical engineering services.
        </p>
        <div className="about-map">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31911.08835626851!2d36.8836608!3d-1.2386304000000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11e545daac99%3A0x828f65117605ea08!2sAccord%20Medical%20Supplies%20Limited!5e0!3m2!1sen!2ske!4v1790766478080!5m2!1sen!2ske"
            title="Accord Medical Supplies Limited on Google Maps"
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="about-actions">
          <Link href={ROUTES.products} className="button button-primary">Browse products</Link>
          <Link href={ROUTES.contact} className="button button-outline">Talk to us</Link>
          <Link href={ROUTES.biomedical} className="button button-outline">Biomedical services</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
