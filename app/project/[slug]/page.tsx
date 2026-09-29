import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getInstallationBySlug } from '@/lib/content-data'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getInstallationBySlug(slug).catch(() => null)
  if (!item || !item.published) return { title: COMPANY.name }
  return { title: `${item.title} | ${COMPANY.shortName} projects`, description: item.body.slice(0, 160) }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await getInstallationBySlug(slug)
  if (!item || !item.published) notFound()

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section job-detail">
        <Link href={ROUTES.projects} className="text-link">← All projects</Link>
        {item.cover && (
          <div className="job-hero">
            <img src={item.cover.secureUrl} alt="" />
          </div>
        )}
        <span className="kicker">{item.facility || 'Project'}</span>
        <h1 className="page-title">{item.title}</h1>
        <p className="hero-lede">{item.location}</p>
        <div className="job-copy">
          <h2>The project</h2>
          <p>{item.body}</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
