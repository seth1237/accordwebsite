import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
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
            {upcoming.map((item) => (
              <article key={item._id} className="job-card">
                <div className="job-card-image">
                  {item.cover ? <img src={item.cover.secureUrl} alt={item.title} /> : <span />}
                </div>
                <div className="job-card-body">
                  <span className="job-meta">{formatWhen(item.startAt)} · {item.location}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.registrationUrl && (
                    <a className="text-link" href={item.registrationUrl} target="_blank" rel="noopener noreferrer">Register</a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div className="past-events">
            <h2>Past events</h2>
            <div className="post-grid">
              {past.map((item) => (
                <article className="post-card" key={item._id}>
                  <div className="post-meta">
                    <span>{item.location}</span>
                    <span>{formatWhen(item.startAt)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
