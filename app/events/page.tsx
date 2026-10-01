import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { EventShare } from '@/components/event-share'
import { eventHref, type EventPost } from '@/lib/content'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { listEvents } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Events & Equipment Demonstrations',
  description: 'Trainings, product demonstrations and facility visits from Accord Medical Supplies in Kenya.',
  path: ROUTES.events,
})

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

function EventCard({ item }: { item: EventPost }) {
  return (
    <article className="job-card">
      <Link href={eventHref(item)} className="job-card-image">
        {item.cover ? <img src={item.cover.secureUrl} alt={item.title} /> : <span />}
      </Link>
      <div className="job-card-body">
        <span className="job-meta">{formatWhen(item.startAt)}{item.location ? ` · ${item.location}` : ''}</span>
        <h3><Link href={eventHref(item)}>{item.title}</Link></h3>
        {item.description ? <p>{item.description}</p> : null}
        <div className="job-card-actions">
          <Link className="button button-primary job-details-btn" href={eventHref(item)}>Read post</Link>
          <EventShare item={item} />
        </div>
      </div>
    </article>
  )
}

export default async function EventsPage() {
  const items = await listEvents(true).catch(() => [])
  const now = Date.now()
  const upcoming = items.filter((item) => new Date(item.startAt).getTime() >= now)
  const past = items.filter((item) => new Date(item.startAt).getTime() < now)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Calendar</span>
        <h1 className="page-title">Upcoming <em>events.</em></h1>
        <p className="hero-lede">Trainings, demonstrations, and facility visits.</p>
        {items.length === 0 && <p className="empty-state">No events listed right now.</p>}
        {upcoming.length > 0 && (
          <div className="job-grid">
            {upcoming.map((item) => <EventCard key={item._id} item={item} />)}
          </div>
        )}
        {past.length > 0 && (
          <div className="past-events">
            <h2>Past events</h2>
            <div className="job-grid">
              {past.map((item) => <EventCard key={item._id} item={item} />)}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
