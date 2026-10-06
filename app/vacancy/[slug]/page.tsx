import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { jobHref } from '@/lib/jobs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getJobBySlug } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'
import { JobShare } from '@/components/job-share'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const job = await getJobBySlug(slug).catch(() => null)
  if (!job || !job.published) return { title: COMPANY.name, robots: { index: false, follow: true } }
  return pageMetadata({
    title: job.title,
    description: job.summary || job.description.slice(0, 160),
    path: jobHref(job),
  })
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job || !job.published) notFound()
  const apply = `mailto:${job.applyEmail || COMPANY.careersEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section job-detail">
        <Breadcrumbs
          items={[
            HOME_CRUMB,
            { name: 'Careers', path: ROUTES.jobs },
            { name: job.title, path: jobHref(job) },
          ]}
        />
        {job.image && (
          <div className="job-hero">
            <img src={job.image.secureUrl} alt={job.title} />
          </div>
        )}
        <span className="kicker">{job.department || 'Careers'}</span>
        <h1 className="page-title">{job.title}</h1>
        <p className="hero-lede">{job.location} · {job.employmentType}</p>
        {job.summary && <p className="job-summary">{job.summary}</p>}
        <div className="job-copy">
          <h2>The role</h2>
          <p>{job.description}</p>
        </div>
        {job.requirements && (
          <div className="job-copy">
            <h2>What we look for</h2>
            <p>{job.requirements}</p>
          </div>
        )}
        <div className="job-card-actions">
          <a href={apply} className="button button-primary">Apply</a>
          <JobShare job={job} />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
