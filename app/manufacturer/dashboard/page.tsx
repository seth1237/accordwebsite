import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ManufacturerDashboard } from '@/components/manufacturer-dashboard'

export default function ManufacturerDashboardPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Manufacturer portal</span>
        <h1 className="page-title">Application <em>status.</em></h1>
        <ManufacturerDashboard />
      </section>
      <SiteFooter />
    </main>
  )
}
