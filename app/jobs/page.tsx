import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { jobHref } from '@/lib/jobs'
import { listJobs } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export default async function Jobs() {
  const jobs = await listJobs(true).catch(() => [])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Make an impact</span>
        <h1 className="page-title">Open <em>roles.</em></h1>
        <p className="hero-lede">Join a team helping healthcare professionals do their best work.</p>
        {jobs.length === 0 && <p className="empty-state">No open roles right now.</p>}
        <div className="job-grid">
          {jobs.map((job) => (
            <Link key={job._id} href={jobHref(job)} className="job-card">
              <div className="job-card-image">
                {job.image ? <img src={job.image.secureUrl} alt="" /> : <span />}
              </div>
              <div className="job-card-body">
                <span className="job-meta">{job.location} · {job.employmentType}</span>
                <h3>{job.title}</h3>
                {job.summary && <p>{job.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
