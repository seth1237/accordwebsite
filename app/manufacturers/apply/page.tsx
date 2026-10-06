import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ManufacturerApplyForm } from '@/components/manufacturer-apply-form'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { ROUTES } from '@/lib/routes'

export default function ManufacturerApplyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs
          items={[
            HOME_CRUMB,
            { name: 'Manufacturers', path: ROUTES.manufacturers },
            { name: 'Apply', path: ROUTES.manufacturersApply },
          ]}
        />
        <span className="kicker">Manufacturer portal</span>
        <h1 className="page-title">Apply to <em>list.</em></h1>
        <p className="hero-lede">Tell us about your company and the equipment you want distributed.</p>
        <ManufacturerApplyForm />
      </section>
      <SiteFooter />
    </main>
  )
}
