import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JobApplyForm } from '@/components/job-apply-form'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Send your CV | Accord Medical Supplies',
  description:
    'Send an open application to Accord Medical Supplies Ltd in Kenya. Choose a department, working terms, and attach your CV.',
  path: ROUTES.jobsApply,
  absoluteTitle: true,
})

export default function JobsApplyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs
          items={[
            HOME_CRUMB,
            { name: 'Careers', path: ROUTES.jobs },
            { name: 'Send your CV', path: ROUTES.jobsApply },
          ]}
        />
        <div className="job-apply-solo">
          <h1 className="page-title">Send your <em>CV.</em></h1>
          <p className="hero-lede">Tell us who you are, choose a department and working terms, and attach your CV. The team will review it.</p>
          <JobApplyForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
