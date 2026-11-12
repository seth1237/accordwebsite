'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { KenyaMap, metricLabel, type MapMetric } from '@/components/kenya-map'
import { formatDuration, type AnalyticsOverview } from '@/lib/kenya-analytics'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'custom', label: 'Custom' },
]

const METRICS: { id: MapMetric; label: string }[] = [
  { id: 'visitors', label: 'Unique visitors' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'pageViews', label: 'Page views' },
  { id: 'returningVisitors', label: 'Returning visitors' },
  { id: 'productViews', label: 'Product views' },
  { id: 'engagementRate', label: 'Engagement rate' },
]

export function intelQuery(range: string, start: string, end: string, device = '', visitorType = '') {
  const query = new URLSearchParams()
  query.set('range', range)
  if (range === 'custom' && start && end) {
    query.set('start_date', start)
    query.set('end_date', end)
  }
  if (device) query.set('device_type', device)
  if (visitorType) query.set('visitor_type', visitorType)
  return query.toString()
}

function n(value: number) {
  return value.toLocaleString('en-KE')
}

export function KenyaIntelDashboard() {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [device, setDevice] = useState('')
  const [visitorType, setVisitorType] = useState('')
  const [metric, setMetric] = useState<MapMetric>('visitors')
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const query = intelQuery(range, start, end, device, visitorType)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/analytics/overview?${query}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.data) throw new Error(body.message || 'Could not load analytics')
      setData(body.data as AnalyticsOverview)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Could not load analytics')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void load()
  }, [load])

  const ranked = useMemo(() => {
    if (!data) return []
    return [...data.counties].sort((a, b) => b.visitors - a.visitors)
  }, [data])

  const emptyCounties = ranked.filter((county) => county.visitors === 0).length
  const maxSeries = Math.max(1, ...(data?.series || []).map((point) => point.visitors))

  return (
    <div className="kenya-intel">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Customer Intelligence</span>
          <h1>Kenya Customer Intelligence</h1>
          <p className="admin-header-note">
            Estimated county reach from IP geolocation. Counts website behaviour, not revenue.
            {data?.updatedAt ? ` Last updated ${new Date(data.updatedAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}.` : ''}
          </p>
        </div>
        <div className="admin-header-tools">
          <a className="button button-outline button-compact" href={`/api/admin/analytics/export?${query}`}>Export CSV</a>
          <Link className="button button-outline button-compact" href={`/admin/intelligence/compare?${query}`}>Compare counties</Link>
        </div>
      </header>

      <div className="kenya-filters">
        {RANGES.map((item) => (
          <button key={item.id} type="button" className={range === item.id ? 'on' : ''} onClick={() => setRange(item.id)}>
            {item.label}
          </button>
        ))}
        {range === 'custom' ? (
          <>
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </>
        ) : null}
        <select value={metric} onChange={(event) => setMetric(event.target.value as MapMetric)} aria-label="Map metric">
          {METRICS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select value={device} onChange={(event) => setDevice(event.target.value)} aria-label="Device">
          <option value="">All devices</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
          <option value="tablet">Tablet</option>
        </select>
        <select value={visitorType} onChange={(event) => setVisitorType(event.target.value)} aria-label="Visitor type">
          <option value="">All visitors</option>
          <option value="new">New visitors</option>
          <option value="returning">Returning visitors</option>
          <option value="engaged">Engaged visitors</option>
          <option value="product">Product viewers</option>
          <option value="cart">Cart users</option>
          <option value="search">Search users</option>
        </select>
      </div>

      {error ? <p className="admin-message">{error}</p> : null}

      <div className="admin-stats kenya-stats">
        <div><span><b>{n(data?.totalVisitors || 0)}</b><small>Total visitors</small></span></div>
        <div><span><b>{n(data?.totalSessions || 0)}</b><small>Total sessions</small></span></div>
        <div><span><b>{n(data?.totalPageViews || 0)}</b><small>Page views</small></span></div>
        <div><span><b>{n(data?.newVisitors || 0)}</b><small>New visitors</small></span></div>
        <div><span><b>{n(data?.returningVisitors || 0)}</b><small>Returning visitors</small></span></div>
        <div><span><b>{n(data?.countiesReached || 0)}</b><small>Counties reached</small></span></div>
        <div><span><b>{n(data?.productViews || 0)}</b><small>Product views</small></span></div>
        <div><span><b>{n(data?.addToCart || 0)}</b><small>Add-to-cart events</small></span></div>
        <div><span><b>{formatDuration(data?.avgSessionSeconds || 0)}</b><small>Avg session</small></span></div>
        <div><span><b>{data?.engagementRate || 0}%</b><small>Engagement rate</small></span></div>
      </div>

      <div className="kenya-map-card admin-card">
        <div className="card-title">
          <div>
            <h3>Kenya county map</h3>
            <span>Colour shows {metricLabel(metric)}. Grey counties have no estimated visitors. Click a county for behaviour detail.</span>
          </div>
        </div>
        {loading && !data ? <p className="empty-state">Loading county map…</p> : (
          <KenyaMap
            counties={data?.counties || []}
            metric={metric}
            selected=""
            onSelect={(code) => router.push(`/admin/intelligence/counties/${code}?${query}`)}
            onReset={() => undefined}
          />
        )}
      </div>

      <div className="kenya-lower">
        <div className="admin-card">
          <div className="card-title">
            <div>
              <h3>Top 10 counties</h3>
              <span>{emptyCounties} counties have no estimated visitors in this period.</span>
            </div>
          </div>
          <ol className="kenya-rank">
            {ranked.slice(0, 10).map((county) => (
              <li key={county.code}>
                <Link href={`/admin/intelligence/counties/${county.code}?${query}`}>
                  <b>{county.name}</b>
                  <small>{county.code} · {n(county.sessions)} sessions</small>
                </Link>
                <strong>{n(county.visitors)}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="admin-card">
          <div className="card-title">
            <div>
              <h3>Visitor trend</h3>
              <span>New versus returning visitors by day (Africa/Nairobi).</span>
            </div>
          </div>
          <div className="kenya-bars" role="img" aria-label="Visitors by day">
            {(data?.series || []).map((point) => (
              <div key={point.date} title={`${point.date}: ${point.visitors} visitors`}>
                <span style={{ height: `${Math.max(4, (point.visitors / maxSeries) * 100)}%` }} />
                <i />
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card">
          <div className="card-title">
            <div>
              <h3>Devices</h3>
              <span>Session device mix.</span>
            </div>
          </div>
          <ul className="kenya-list">
            <li><span>Mobile</span><b>{n(data?.devices.mobile || 0)}</b></li>
            <li><span>Desktop</span><b>{n(data?.devices.desktop || 0)}</b></li>
            <li><span>Tablet</span><b>{n(data?.devices.tablet || 0)}</b></li>
          </ul>
        </div>
        <div className="admin-card">
          <div className="card-title">
            <div>
              <h3>Traffic sources</h3>
              <span>From referrer and landing path. No paid revenue metrics.</span>
            </div>
          </div>
          <ul className="kenya-list">
            {(data?.trafficSources || []).map((item) => (
              <li key={item.source}><span>{item.source}</span><b>{n(item.sessions)}</b></li>
            ))}
            {!data?.trafficSources.length ? <li><span>No sessions yet</span></li> : null}
          </ul>
        </div>
      </div>
      <p className="kenya-note">
        Engaged session: longer than 10 seconds, two or more page views, or a product/cart/search interaction.
        Bounce rate is the share of non-engaged sessions. Unknown ({n(data?.unknownVisitors || 0)}) and outside Kenya ({n(data?.outsideKenyaVisitors || 0)}) visitors are excluded from county totals.
      </p>
    </div>
  )
}
