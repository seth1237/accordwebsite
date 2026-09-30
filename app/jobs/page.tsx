import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JobShare } from '@/components/job-share'
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

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Make an impact</span>
        <h1 className="page-title">Open <em>roles.</em></h1>
        <p className="hero-lede">Join Accord Medical Supplies — careers in sales, biomedical support and warehouse operations for healthcare facilities in Kenya.</p>
        {jobs.length === 0 && <p className="empty-state">No open roles right now.</p>}
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
      </section>
      <SiteFooter />
    </main>
  )
}
