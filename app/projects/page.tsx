import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { installationHref } from '@/lib/content'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { listInstallations } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Hospital Equipment Installations & Projects | Accord Medical',
  description:
    'Recent medical equipment installations by Accord Medical Supplies for hospitals and clinics in Kenya, including maternity, laboratory and theatre projects.',
  path: ROUTES.projects,
  absoluteTitle: true,
})

export default async function ProjectsPage() {
  const items = await listInstallations(true).catch(() => [])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">From the field</span>
        <h1 className="page-title">Recent <em>projects.</em></h1>
        <p className="hero-lede">Case studies from facilities we have equipped and commissioned.</p>
        {items.length === 0 && <p className="empty-state">No projects published yet.</p>}
        <div className="job-grid">
          {items.map((item) => (
            <Link key={item._id} href={installationHref(item)} className="job-card">
              <div className="job-card-image">
                {item.cover ? <img src={item.cover.secureUrl} alt={item.title} /> : <span />}
              </div>
              <div className="job-card-body">
                <span className="job-meta">{item.facility} · {item.location}</span>
                <h2>{item.title}</h2>
                <p>{item.body.slice(0, 140)}{item.body.length > 140 ? '…' : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
