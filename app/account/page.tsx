import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { AccountDashboard } from '@/components/account-dashboard'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { getCustomerSession } from '@/lib/auth'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getAccountDashboard } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Your account',
  description: 'View your Accord Medical Supplies account and track M-Pesa orders.',
  path: ROUTES.account,
})

export default async function AccountPage() {
  const [session, dashboard] = await Promise.all([
    getCustomerSession(),
    getAccountDashboard(),
  ])
  if (!session || !dashboard) redirect(ROUTES.accountLogin)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Account', path: ROUTES.account }]} />
        <span className="kicker">Account</span>
        <h1 className="page-title">Your <em>orders.</em></h1>
        <p className="hero-lede">Signed in with your facility phone number. You stay signed in for months unless you sign out.</p>
        <AccountDashboard
          account={dashboard.account}
          orders={dashboard.orders}
          viewed={dashboard.viewed}
          bought={dashboard.bought}
        />
      </section>
      <SiteFooter />
    </main>
  )
}
