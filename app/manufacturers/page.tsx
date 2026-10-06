import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const metadata: Metadata = pageMetadata({
  title: 'Manufacturers & Suppliers',
  description: 'Submit your products for consideration.',
  path: '/manufacturers',
})

export default function ManufacturersPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Manufacturers', path: ROUTES.manufacturers }]} />
        <span className="kicker">Partners</span>
        <h1 className="page-title">Become a <em>supplier.</em></h1>
        <p className="hero-lede">Submit your products for consideration.</p>
        <div className="about-actions">
          <Link href="/manufacturers/apply" className="button button-primary">Apply to list products</Link>
          <Link href="/manufacturer/dashboard" className="button button-outline">Check application status</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
