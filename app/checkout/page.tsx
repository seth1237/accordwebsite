import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CheckoutForm } from '@/components/checkout-form'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getCustomerSession } from '@/lib/auth'
import { getCatalog, getCustomerAccount } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Checkout',
  description: 'Pay for selected Accord Medical Supplies equipment in Kenya by M-Pesa.',
  path: ROUTES.checkout,
})

export default async function CheckoutPage() {
  const session = await getCustomerSession().catch(() => null)
  const [catalog, account] = await Promise.all([
    getCatalog(),
    session ? getCustomerAccount().catch(() => null) : Promise.resolve(null),
  ])
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Checkout', path: ROUTES.checkout }]} />
        <span className="kicker">Checkout</span>
        <h1 className="page-title">Pay with <em>M-Pesa.</em></h1>
        <p className="hero-lede">Only products the team has opened for checkout can be paid for here. Other equipment stays on a quote.</p>
        <div className="catalog-body">
          <CheckoutForm products={catalog.products} account={account} />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
