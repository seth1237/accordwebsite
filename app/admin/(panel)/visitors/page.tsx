import { Eye, Users } from 'lucide-react'
import { getVisitorStats } from '@/lib/site-data'

function formatDay(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminVisitorsPage() {
  const stats = await getVisitorStats().catch(() => ({
    today: { date: '', visitors: 0, pageviews: 0 },
    days: [],
  }))
  const maxVisitors = Math.max(1, ...stats.days.map((row) => row.visitors))

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Visitors</h1>
        </div>
      </header>
      <div className="admin-stats">
        <div><Users /><span><b>{stats.today.visitors}</b><small>Unique visitors today</small></span></div>
        <div><Eye /><span><b>{stats.today.pageviews}</b><small>Page views today</small></span></div>
      </div>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Daily visitors</h3>
            <span>Unique browsers counted once per day, plus total page views. Kenya time.</span>
          </div>
        </div>
        {stats.days.length === 0 && <p className="empty-state">No visits recorded yet. Counts start as people browse the public site.</p>}
        <div className="visitor-day-list">
          {stats.days.map((row) => (
            <div key={row.date} className="visitor-day">
              <div className="visitor-day-head">
                <b>{formatDay(row.date)}</b>
                <strong>{row.visitors}</strong>
              </div>
              <div className="category-perf-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((row.visitors / maxVisitors) * 100)}%` }} />
              </div>
              <small>{row.pageviews} page views</small>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
