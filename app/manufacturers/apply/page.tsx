import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ManufacturerApplyForm } from '@/components/manufacturer-apply-form'

export default function ManufacturerApplyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Manufacturer portal</span>
        <h1 className="page-title">Apply to <em>list.</em></h1>
        <p className="hero-lede">Tell us about your company and the equipment you want distributed.</p>
        <ManufacturerApplyForm />
      </section>
      <SiteFooter />
    </main>
  )
}
