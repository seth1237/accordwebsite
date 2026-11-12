'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { KENYA_COUNTIES } from '@/lib/kenya-counties'
import { formatDuration, type CountyDetail } from '@/lib/kenya-analytics'

function n(value: number) {
  return value.toLocaleString('en-KE')
}

export function KenyaIntelCompare() {
  const search = useSearchParams()
  const query = search.toString()
  const [codes, setCodes] = useState<string[]>(['47', '01', '42'])
  const [rows, setRows] = useState<CountyDetail[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggle(code: string) {
    setCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code)
      if (current.length >= 5) return current
      return [...current, code]
    })
  }

  async function compare() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/analytics/counties/compare?codes=${codes.join(',')}&${query}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.data) throw new Error(body.message || 'Could not compare')
      setRows(body.data as CountyDetail[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compare')
    } finally {
      setLoading(false)
    }
  }

  const metrics = useMemo(() => ([
    { label: 'Visitors', value: (row: CountyDetail) => n(row.visitors.total) },
    { label: 'New', value: (row: CountyDetail) => n(row.visitors.new) },
    { label: 'Returning', value: (row: CountyDetail) => n(row.visitors.returning) },
    { label: 'Sessions', value: (row: CountyDetail) => n(row.sessions) },
    { label: 'Page views', value: (row: CountyDetail) => n(row.pageViews) },
    { label: 'Avg session', value: (row: CountyDetail) => formatDuration(row.averageSessionDuration) },
    { label: 'Product views', value: (row: CountyDetail) => n(row.productViews) },
    { label: 'Add to cart', value: (row: CountyDetail) => n(row.addToCartEvents) },
    { label: 'Engagement', value: (row: CountyDetail) => `${row.engagementRate}%` },
    { label: 'Mobile / desktop / tablet', value: (row: CountyDetail) => `${row.devices.mobile} / ${row.devices.desktop} / ${row.devices.tablet}` },
  ]), [])

  return (
    <div className="kenya-intel">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Customer Intelligence</span>
          <h1>County comparison</h1>
          <p className="admin-header-note">Select up to five counties. Visitor behaviour only — no revenue.</p>
        </div>
        <Link className="button button-outline button-compact" href={`/admin/intelligence?${query}`}>Kenya map</Link>
      </header>
      <div className="kenya-compare-pick">
        {KENYA_COUNTIES.map((county) => (
          <label key={county.code} className={codes.includes(county.code) ? 'on' : ''}>
            <input type="checkbox" checked={codes.includes(county.code)} onChange={() => toggle(county.code)} />
            {county.name}
          </label>
        ))}
      </div>
      <button type="button" className="button button-primary button-compact" onClick={() => void compare()} disabled={!codes.length || loading}>
        {loading ? 'Comparing…' : `Compare ${codes.length} counties`}
      </button>
      {error ? <p className="admin-message">{error}</p> : null}
      {rows.length ? (
        <div className="admin-card kenya-table-wrap">
          <table className="kenya-table">
            <thead>
              <tr>
                <th>Metric</th>
                {rows.map((row) => <th key={row.county.code}>{row.county.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label}>
                  <th>{metric.label}</th>
                  {rows.map((row) => <td key={row.county.code}>{metric.value(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
