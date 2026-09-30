import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { pageMetadata } from '@/lib/seo'
import { COMPANY } from '@/lib/utils'

export const metadata: Metadata = pageMetadata({
  title: 'Manufacturers & Suppliers',
  description:
    'Manufacturers who want medical equipment listed with Accord Medical Supplies in Kenya can apply to become a supplier.',
  path: '/manufacturers',
})

export default function ManufacturersPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Partners</span>
        <h1 className="page-title">Become a <em>supplier.</em></h1>
        <p className="hero-lede">
          {COMPANY.name} is a reseller and accredited dealer. Manufacturers who want their products listed for Kenyan facilities can apply here.
        </p>
        <div className="about-copy">
          <p>
            We review submissions before anything goes live on the catalogue. Approved partners can be credited on product pages as “Distributed for”.
          </p>
        </div>
        <div className="about-actions">
          <Link href="/manufacturers/apply" className="button button-primary">Apply to list products</Link>
          <Link href="/manufacturer/dashboard" className="button button-outline">Check application status</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
