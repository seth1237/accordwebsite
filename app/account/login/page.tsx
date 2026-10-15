import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { AccountLoginForm } from '@/components/account-auth-forms'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { getCustomerSession } from '@/lib/auth'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Sign in',
  description: 'Sign in to your Accord Medical Supplies account to track orders.',
  path: ROUTES.accountLogin,
})

export default async function AccountLoginPage() {
  const session = await getCustomerSession()
  if (session) redirect(ROUTES.account)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Account', path: ROUTES.account }, { name: 'Sign in', path: ROUTES.accountLogin }]} />
        <span className="kicker">Account</span>
        <h1 className="page-title">Sign <em>in.</em></h1>
        <p className="hero-lede">Use the facility phone number from your account. You stay signed in for months.</p>
        <AccountLoginForm />
      </section>
      <SiteFooter />
    </main>
  )
}
