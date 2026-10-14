import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JobApplyForm } from '@/components/job-apply-form'
import { JobShare } from '@/components/job-share'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { jobHref } from '@/lib/jobs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { listJobs } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Jobs at Accord Medical Supplies | Careers in Kenya',
  description:
    'Open roles at Accord Medical Supplies Ltd in Kenya. Sales, biomedical and warehouse careers with a medical equipment supplier serving hospitals and clinics.',
  path: ROUTES.jobs,
  absoluteTitle: true,
})

export default async function Jobs() {
  const jobs = await listJobs(true).catch(() => [])
  const hasRoles = jobs.length > 0

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Careers', path: ROUTES.jobs }]} />
        {hasRoles ? (
          <div className="jobs-split">
            <div>
              <h1 className="page-title">Open <em>roles.</em></h1>
              <p className="hero-lede">Join Accord Medical Supplies — careers in sales, biomedical support and warehouse operations for healthcare facilities in Kenya.</p>
              <div className="job-grid">
                {jobs.map((job) => (
                  <article key={job._id} className="job-card">
                    <Link href={jobHref(job)} className="job-card-image" aria-label={job.title}>
                      {job.image ? <img src={job.image.secureUrl} alt="" /> : <span />}
                    </Link>
                    <div className="job-card-body">
                      <span className="job-meta">{job.location} · {job.employmentType}</span>
                      <h2>
                        <Link href={jobHref(job)}>{job.title}</Link>
                      </h2>
                      {job.summary && <p>{job.summary}</p>}
                      <div className="job-card-actions">
                        <Link href={jobHref(job)} className="button button-primary job-details-btn">
                          View Application details
                        </Link>
                        <JobShare job={job} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="jobs-cv-panel">
              <h2 className="page-title">Send your <em>CV.</em></h2>
              <p className="hero-lede">No listing for you? Send an open application and the team will review it.</p>
              <Link href={ROUTES.jobsApply} className="button button-primary">
                Send your CV
              </Link>
            </aside>
          </div>
        ) : (
          <div className="job-apply-solo">
            <h1 className="page-title">Send your <em>CV.</em></h1>
            <p className="hero-lede">There are no listed roles right now. Tell us who you are, choose a department and working terms, and attach your CV.</p>
            <JobApplyForm />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
