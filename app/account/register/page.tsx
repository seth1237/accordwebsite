import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { AccountRegisterForm } from '@/components/account-auth-forms'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { getCustomerSession } from '@/lib/auth'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Create an account',
  description: 'Create an Accord Medical Supplies account to track equipment orders.',
  path: ROUTES.accountRegister,
})

export default async function AccountRegisterPage() {
  const session = await getCustomerSession()
  if (session) redirect(ROUTES.account)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Account', path: ROUTES.account }, { name: 'Create account', path: ROUTES.accountRegister }]} />
        <span className="kicker">Account</span>
        <h1 className="page-title">Create an <em>account.</em></h1>
        <p className="hero-lede">Name, facility, phone, and location only. We keep you signed in so you can track orders.</p>
        <AccountRegisterForm />
      </section>
      <SiteFooter />
    </main>
  )
}
