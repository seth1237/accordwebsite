'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatDuration, type CountyDetail } from '@/lib/kenya-analytics'

function n(value: number) {
  return value.toLocaleString('en-KE')
}

export function KenyaIntelCounty({ code }: { code: string }) {
  const search = useSearchParams()
  const query = search.toString()
  const [data, setData] = useState<CountyDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/admin/analytics/counties/${code}?${query}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.data) throw new Error(body.message || 'County not found')
        if (!cancelled) setData(body.data as CountyDetail)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load county')
      })
    return () => {
      cancelled = true
    }
  }, [code, query])

  const maxHour = Math.max(1, ...(data?.hourly || []).map((item) => item.visitors))

  return (
    <div className="kenya-intel">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Customer Intelligence</span>
          <h1>{data?.county.name || 'County'} <small>#{data?.county.code || code}</small></h1>
          <p className="admin-header-note">
            Estimated IP location only. {data ? `${data.period.start} to ${data.period.end}` : ''}
          </p>
        </div>
        <Link className="button button-outline button-compact" href={`/admin/intelligence?${query}`}>Back to Kenya map</Link>
      </header>
      {error ? <p className="admin-message">{error}</p> : null}
      <div className="admin-stats kenya-stats">
        <div><span><b>{n(data?.visitors.total || 0)}</b><small>Unique visitors</small></span></div>
        <div><span><b>{n(data?.sessions || 0)}</b><small>Sessions</small></span></div>
        <div><span><b>{n(data?.visitors.new || 0)}</b><small>New visitors</small></span></div>
        <div><span><b>{n(data?.visitors.returning || 0)}</b><small>Returning visitors</small></span></div>
        <div><span><b>{n(data?.pageViews || 0)}</b><small>Page views</small></span></div>
        <div><span><b>{formatDuration(data?.averageSessionDuration || 0)}</b><small>Avg session</small></span></div>
        <div><span><b>{n(data?.productViews || 0)}</b><small>Products viewed</small></span></div>
        <div><span><b>{n(data?.addToCartEvents || 0)}</b><small>Cart additions</small></span></div>
        <div><span><b>{Number(data?.pagesPerSession || 0).toFixed(1)}</b><small>Pages / session</small></span></div>
        <div><span><b>{data?.engagementRate || 0}%</b><small>Engagement</small></span></div>
        <div><span><b>{data?.bounceRate || 0}%</b><small>Bounce rate</small></span></div>
      </div>
      <div className="kenya-lower">
        <div className="admin-card">
          <h3>Most visited pages</h3>
          <ul className="kenya-list">{(data?.pages || []).map((item) => <li key={item.path}><span>{item.path}</span><b>{n(item.views)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Most viewed products</h3>
          <ul className="kenya-list">{(data?.products || []).map((item) => <li key={item.productId}><span>{item.name}<small> {item.carts} carts · {item.shares} shares</small></span><b>{n(item.views)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Search terms</h3>
          <ul className="kenya-list">{(data?.searches || []).map((item) => <li key={item.term}><span>{item.term}</span><b>{n(item.count)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Categories</h3>
          <ul className="kenya-list">{(data?.categories || []).map((item) => <li key={item.name}><span>{item.name}</span><b>{n(item.views)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Features used</h3>
          <ul className="kenya-list">{(data?.features || []).map((item) => <li key={item.event}><span>{item.event}</span><b>{n(item.count)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Navigation paths</h3>
          <ul className="kenya-list">{(data?.paths || []).map((item) => <li key={`${item.from}-${item.to}`}><span>{item.from} → {item.to}</span><b>{n(item.count)}</b></li>)}</ul>
        </div>
        <div className="admin-card">
          <h3>Devices</h3>
          <ul className="kenya-list">
            <li><span>Mobile</span><b>{n(data?.devices.mobile || 0)}</b></li>
            <li><span>Desktop</span><b>{n(data?.devices.desktop || 0)}</b></li>
            <li><span>Tablet</span><b>{n(data?.devices.tablet || 0)}</b></li>
          </ul>
        </div>
        <div className="admin-card">
          <h3>Traffic sources</h3>
          <ul className="kenya-list">{(data?.trafficSources || []).map((item) => <li key={item.source}><span>{item.source}</span><b>{n(item.sessions)}</b></li>)}</ul>
        </div>
      </div>
      <div className="admin-card">
        <h3>Visitors by hour</h3>
        <div className="kenya-bars kenya-hours">
          {(data?.hourly || []).map((item) => (
            <div key={item.hour} title={`${item.hour}:00 · ${item.visitors}`}>
              <span style={{ height: `${Math.max(4, (item.visitors / maxHour) * 100)}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
