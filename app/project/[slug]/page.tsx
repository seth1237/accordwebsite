import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { installationHref } from '@/lib/content'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getInstallationBySlug } from '@/lib/site-data'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getInstallationBySlug(slug).catch(() => null)
  if (!item || !item.published) return { title: COMPANY.name, robots: { index: false, follow: true } }
  return pageMetadata({
    title: item.title,
    description: item.body.slice(0, 160),
    path: installationHref(item),
  })
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await getInstallationBySlug(slug)
  if (!item || !item.published) notFound()

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section job-detail">
        <Breadcrumbs
          items={[
            HOME_CRUMB,
            { name: 'Projects', path: ROUTES.projects },
            { name: item.title, path: installationHref(item) },
          ]}
        />
        {item.cover && (
          <div className="job-hero">
            <img src={item.cover.secureUrl} alt={item.title} />
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
