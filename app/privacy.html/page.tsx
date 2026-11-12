import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { ROUTES } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo'
import { COMPANY } from '@/lib/utils'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy notice | Accord Medical Supplies',
  description: 'How Accord Medical Supplies collects anonymous website analytics using IP-based county estimates in Kenya.',
  path: ROUTES.privacy,
  absoluteTitle: true,
})

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section about-page">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Privacy', path: ROUTES.privacy }]} />
        <span className="kicker">Data protection</span>
        <h1 className="page-title">Privacy notice</h1>
        <p>
          {COMPANY.name} collects limited website analytics so we can understand which Kenyan counties our visitors
          come from and how they use the catalogue. This helps us stock and support hospitals more effectively.
        </p>
        <h2>What we collect</h2>
        <p>
          We store an anonymous first-party visitor identifier, a session identifier, page paths, product identifiers,
          search terms, device type, and an estimated Kenyan county derived from IP geolocation. We do not request GPS
          permission and we do not use browser fingerprinting.
        </p>
        <h2>What we do not collect</h2>
        <p>
          We do not keep raw IP addresses as a lasting visitor record. We do not record passwords, payment details,
          checkout form contents, names, phone numbers or email addresses in the analytics tables.
        </p>
        <h2>Lawful basis and retention</h2>
        <p>
          Analytics are processed for legitimate interest in understanding website use across Kenya, in line with the
          Data Protection Act, 2019. Session and event records are kept for up to 24 months, then deleted.
        </p>
        <p>
          Questions: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </p>
      </section>
      <SiteFooter />
    </main>
  )
}
