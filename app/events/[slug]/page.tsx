import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { EventBodyView, EventMeta } from '@/components/event-body-view'
import { EventEngagement } from '@/components/event-engagement'
import { EventShare } from '@/components/event-share'
import { eventHref } from '@/lib/content'
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getEventBySlug } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getEventBySlug(slug).catch(() => null)
  if (!item || !item.published) return { title: COMPANY.name, robots: { index: false, follow: true } }
  return pageMetadata({
    title: item.title,
    description: item.description || `Event from ${COMPANY.shortName}`,
    path: eventHref(item),
    image: `/events/${item.slug}/opengraph-image`,
    imageType: 'image/jpeg',
    type: 'article',
  })
}

export default async function EventPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await getEventBySlug(slug).catch(() => null)
  if (!item || !item.published) notFound()
  const path = eventHref(item)
  const registerExternal = Boolean(item.registrationUrl) && !item.registrationUrl.startsWith('/')

  return (
    <main className="min-h-screen">
      <JsonLd data={articleJsonLd({
        title: item.title,
        description: item.description,
        path,
        date: item.startAt,
        image: `/events/${item.slug}/opengraph-image`,
      })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Events', path: ROUTES.events },
          { name: item.title, path },
        ])}
      />
      <SiteHeader />
      <article className="shell section event-article">
        <Link href={ROUTES.events} className="text-link">← All events</Link>
        <span className="kicker">Event</span>
        <h1 className="page-title">{item.title}</h1>
        <div className="event-headline">
          <EventMeta item={item} />
          <EventShare item={item} />
        </div>
        {item.cover ? (
          <figure className="event-cover">
            <img src={item.cover.secureUrl} alt={item.title} />
          </figure>
        ) : null}
        {item.description ? <p className="hero-lede">{item.description}</p> : null}
        <EventBodyView blocks={item.body} />
        {item.registrationUrl ? (
          <p className="event-register">
            <a
              className="button button-primary"
              href={item.registrationUrl}
              target={registerExternal ? '_blank' : undefined}
              rel={registerExternal ? 'noopener noreferrer' : undefined}
            >
              Register
            </a>
            <EventShare item={item} />
          </p>
        ) : null}
        <EventEngagement slug={item.slug} />
      </article>
      <SiteFooter />
    </main>
  )
}
