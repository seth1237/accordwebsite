'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  emptySearchReport,
  parseSearchKind,
  type SearchKind,
  type SearchReport,
} from '@/lib/search-analytics'
import {
  defaultRange,
  kenyaToday,
  visitorLabel,
  type VisitorPeriod,
} from '@/lib/visitor-report'

const PERIODS: { id: VisitorPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

const KINDS: { id: SearchKind; label: string }[] = [
  { id: 'all', label: 'All searches' },
  { id: 'unmet', label: 'Unfulfilled' },
  { id: 'matched', label: 'In catalogue' },
]

type ChartMetric = 'searches' | 'unmatched' | 'matched'

const CHART_METRICS: { id: ChartMetric; label: string }[] = [
  { id: 'searches', label: 'Searches' },
  { id: 'unmatched', label: 'Unfulfilled' },
  { id: 'matched', label: 'In catalogue' },
]

function formatCount(value: number) {
  return value.toLocaleString('en-KE')
}

function formatWhen(iso: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
}

function niceMax(value: number) {
  if (value <= 4) return 4
  const exp = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / exp) * exp
}

function labelIndexes(count: number, maxLabels = 6) {
  if (count <= maxLabels) return Array.from({ length: count }, (_, index) => index)
  const marks = new Set([0, count - 1])
  for (let step = 1; step < maxLabels - 1; step += 1) {
    marks.add(Math.round((step / (maxLabels - 1)) * (count - 1)))
  }
  return [...marks].sort((a, b) => a - b)
}

function metricValue(point: SearchReport['series'][number], metric: ChartMetric) {
  if (metric === 'matched') return point.matched
  if (metric === 'unmatched') return point.unmatched
  return point.searches
}

function SearchChart({
  period,
  series,
  metric,
}: {
  period: VisitorPeriod
  series: SearchReport['series']
  metric: ChartMetric
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 720
  const height = 228
  const pad = { left: 40, right: 14, top: 18, bottom: 34 }
  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...series.map((point) => metricValue(point, metric))))
  const count = series.length
  const xAt = (index: number) => pad.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth)
  const yAt = (value: number) => pad.top + innerHeight - (value / max) * innerHeight
  const ticks = [0, max / 2, max]
  const line = series.map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index)} ${yAt(metricValue(point, metric))}`).join(' ')
  const area = count ? `${line} L${xAt(count - 1)} ${yAt(0)} L${xAt(0)} ${yAt(0)} Z` : ''
  const active = hover != null ? series[hover] : null

  function nearestIndex(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect()
    const pointX = ((clientX - rect.left) / rect.width) * width
    let best = 0
    let bestDistance = Infinity
    series.forEach((_, index) => {
      const distance = Math.abs(xAt(index) - pointX)
      if (distance < bestDistance) {
        best = index
        bestDistance = distance
      }
    })
    return best
  }

  return (
    <div className="visitor-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Search intent over time"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => setHover(nearestIndex(event.clientX, event.currentTarget))}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="visitor-grid" x1={pad.left} x2={width - pad.right} y1={yAt(tick)} y2={yAt(tick)} />
            <text className="visitor-axis" x={pad.left - 8} y={yAt(tick) + 4} textAnchor="end">{Number.isInteger(tick) ? tick : Math.round(tick)}</text>
          </g>
        ))}
        {area && <path className="visitor-area" d={area} />}
        {line && <path className="visitor-line" d={line} />}
        {count <= 24 && series.map((point, index) => (
          <circle key={point.date} className="visitor-dot" cx={xAt(index)} cy={yAt(metricValue(point, metric))} r={hover === index ? 4.5 : 3} />
        ))}
        {labelIndexes(count).map((index) => {
          const isFirst = index === 0
          const isLast = index === count - 1
          return (
            <text
              key={series[index].date}
              className="visitor-axis visitor-x"
              x={xAt(index)}
              y={height - 10}
              textAnchor={isLast ? 'end' : isFirst ? 'start' : 'middle'}
            >
              {visitorLabel(period, series[index].date)}
            </text>
          )
        })}
        {active && hover != null && (
          <line className="visitor-guide" x1={xAt(hover)} x2={xAt(hover)} y1={pad.top} y2={pad.top + innerHeight} />
        )}
      </svg>
      {active && hover != null && (
        <div className="visitor-tip" style={{ left: `${(xAt(hover) / width) * 100}%` }}>
          <b>{visitorLabel(period, active.date)}</b>
          <span>{formatCount(active.searches)} searches</span>
          <span>{formatCount(active.matched)} in catalogue</span>
          <span>{formatCount(active.unmatched)} unfulfilled</span>
        </div>
      )}
    </div>
  )
}

function DemandList({
  title,
  note,
  empty,
  rows,
}: {
  title: string
  note: string
  empty: string
  rows: SearchReport['unmet']
}) {
  const max = Math.max(1, ...rows.map((row) => row.sessions || row.searches))
  return (
    <div className="admin-card search-demand">
      <div className="card-title">
        <div>
          <h3>{title}</h3>
          <span>{note}</span>
        </div>
      </div>
      <div className="category-perf-list">
        {rows.map((row) => (
          <div key={row.query} className="category-perf">
            <div className="category-perf-head">
              <b>{row.query}</b>
              <strong>{formatCount(row.sessions)}</strong>
            </div>
            <div className="category-perf-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((row.sessions / max) * 100)}%` }} />
            </div>
            <small>
              {formatCount(row.searches)} searches · {formatCount(row.resultCount)} matching products · {row.activityLabel} · {formatWhen(row.lastAt)}
            </small>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-state">{empty}</p>}
      </div>
    </div>
  )
}

export function AdminSearchReport({ initial }: { initial: SearchReport }) {
  const [period, setPeriod] = useState<VisitorPeriod>(initial.period)
  const [kind, setKind] = useState<SearchKind>('all')
  const [metric, setMetric] = useState<ChartMetric>('searches')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [report, setReport] = useState(initial)
  const [loading, setLoading] = useState(false)
  const skipFirst = useRef(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(qInput.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [qInput])

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ period, from, to, kind })
    if (q) params.set('q', q)
    fetch(`/api/admin/search?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.data?.totals) {
          setReport(payload.data)
          if (payload.data.from) setFrom(payload.data.from)
          if (payload.data.to) setTo(payload.data.to)
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error(error)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [period, from, to, kind, q])

  const peak = useMemo(() => {
    return report.series.reduce(
      (best, point) => (metricValue(point, metric) > metricValue(best, metric) ? point : best),
      report.series[0] || { date: '', searches: 0, matched: 0, unmatched: 0 },
    )
  }, [report.series, metric])
  const today = kenyaToday()
  const hasTraffic = report.series.some((point) => point.searches)
  const peakValue = metricValue(peak, metric)
  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ period, from, to, kind })
    if (q) params.set('q', q)
    return `/api/admin/search/export?${params}`
  }, [period, from, to, kind, q])

  function choosePeriod(next: VisitorPeriod) {
    const range = defaultRange(next)
    setPeriod(next)
    setFrom(range.from)
    setTo(range.to)
    setReport(emptySearchReport(next))
  }

  return (
    <div className="admin-search">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Search analytics</h1>
          <p className="admin-header-note">What customers type in product search, including searches with no matching products. Kenya time.</p>
        </div>
        <a className="button button-outline button-compact" href={exportHref}>Download Excel</a>
      </header>
      <section className="admin-card visitor-report">
        <div className="visitor-toolbar">
          <div className="visitor-toolbar-groups">
            <div className="visitor-periods" role="group" aria-label="Report period">
              {PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={period === item.id ? 'is-on' : ''}
                  aria-pressed={period === item.id}
                  onClick={() => choosePeriod(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="visitor-periods" role="group" aria-label="Search type">
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={kind === item.id ? 'is-on' : ''}
                  aria-pressed={kind === item.id}
                  onClick={() => setKind(parseSearchKind(item.id))}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="visitor-periods" role="group" aria-label="Chart metric">
              {CHART_METRICS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={metric === item.id ? 'is-on' : ''}
                  aria-pressed={metric === item.id}
                  onClick={() => setMetric(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="visitor-range">
            <label>
              Find query
              <input
                type="search"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Filter searches"
              />
            </label>
            <label>
              From
              <input type="date" max={to < today ? to : today} value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              To
              <input type="date" min={from} max={today} value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
        </div>
        <div className={`visitor-kpis search-kpis${loading ? ' is-loading' : ''}`}>
          <div>
            <b>{formatCount(report.totals.searches)}</b>
            <small>Searches</small>
          </div>
          <div>
            <b>{formatCount(report.totals.uniqueQueries)}</b>
            <small>Unique queries</small>
          </div>
          <div>
            <b>{formatCount(report.totals.uniqueSessions)}</b>
            <small>Unique sessions</small>
          </div>
          <div>
            <b>{formatCount(report.totals.matched)}</b>
            <small>In the catalogue</small>
          </div>
          <div>
            <b>{formatCount(report.totals.unmatched)}</b>
            <small>Unfulfilled demand</small>
          </div>
        </div>
        <p className="visitor-chart-caption">
          Chart shows {metric === 'matched' ? 'catalogue matches' : metric === 'unmatched' ? 'unfulfilled searches' : 'all searches'}
          {peakValue && peak.date ? ` · peak ${formatCount(peakValue)} on ${visitorLabel(report.period, peak.date)}` : ''}
        </p>
        <SearchChart period={report.period} series={report.series} metric={metric} />
        {!hasTraffic && <p className="visitor-empty">No product searches in this range yet.</p>}
        <div className="visitor-table-wrap">
          <table className="visitor-table">
            <thead>
              <tr>
                <th>{report.period === 'monthly' ? 'Month' : report.period === 'weekly' ? 'Week' : 'Date'}</th>
                <th>Searches</th>
                <th>In catalogue</th>
                <th>Unfulfilled</th>
              </tr>
            </thead>
            <tbody>
              {[...report.series].reverse().map((row) => (
                <tr key={row.date}>
                  <td>{visitorLabel(report.period, row.date)}</td>
                  <td>{formatCount(row.searches)}</td>
                  <td>{formatCount(row.matched)}</td>
                  <td>{formatCount(row.unmatched)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="search-demand-grid">
        <DemandList
          title="Unfulfilled demand"
          note="Searches with no matching products. Ranked by unique sessions."
          empty="No unmatched catalogue searches in this range."
          rows={report.unmet}
        />
        <DemandList
          title="In the catalogue"
          note="Searches that found products already in the system. Ranked by search volume."
          empty="No searches matched products in this range."
          rows={report.matched}
        />
      </div>
      <section className="admin-card">
        <div className="card-title">
          <div>
            <h3>Search history</h3>
            <span>Latest saved queries after typing paused, the search bar lost focus, or the page closed.</span>
          </div>
        </div>
        <div className="visitor-table-wrap search-history-wrap">
          <table className="visitor-table search-history">
            <thead>
              <tr>
                <th>Query</th>
                <th>Event</th>
                <th>Last activity</th>
                <th>Matches</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {report.history.map((row) => (
                <tr key={row.id}>
                  <td>{row.query}</td>
                  <td>{row.eventLabel}</td>
                  <td>{row.activityLabel}</td>
                  <td>{formatCount(row.resultCount)}</td>
                  <td>{formatWhen(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.history.length === 0 && <p className="empty-state">No search activity recorded yet.</p>}
        </div>
      </section>
    </div>
  )
}
