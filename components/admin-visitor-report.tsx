'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  defaultRange,
  fillVisitorSeries,
  kenyaToday,
  monthStart,
  visitorLabel,
  weekStart,
  type VisitorPeriod,
  type VisitorPoint,
  type VisitorReport,
} from '@/lib/visitor-report'

const PERIODS: { id: VisitorPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

function formatCount(value: number) {
  return value.toLocaleString('en-KE')
}

function placeholderSeries(period: VisitorPeriod, from: string, to: string) {
  const start = period === 'weekly' ? weekStart(from) : period === 'monthly' ? monthStart(from) : from
  return fillVisitorSeries(period, start, to, [])
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

function VisitorChart({ period, series }: { period: VisitorPeriod; series: VisitorPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 720
  const height = 228
  const pad = { left: 40, right: 14, top: 18, bottom: 34 }
  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...series.map((point) => point.visitors)))
  const count = series.length
  const xAt = (index: number) => pad.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth)
  const yAt = (value: number) => pad.top + innerHeight - (value / max) * innerHeight
  const ticks = [0, max / 2, max]
  const line = series.map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index)} ${yAt(point.visitors)}`).join(' ')
  const area = count
    ? `${line} L${xAt(count - 1)} ${yAt(0)} L${xAt(0)} ${yAt(0)} Z`
    : ''
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
        aria-label="Visitors over time"
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
          <circle key={point.date} className="visitor-dot" cx={xAt(index)} cy={yAt(point.visitors)} r={hover === index ? 4.5 : 3} />
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
          <span>{formatCount(active.visitors)} visitors</span>
          <span>{formatCount(active.pageviews)} page views</span>
        </div>
      )}
    </div>
  )
}

export function AdminVisitorReport({ initial }: { initial: VisitorReport }) {
  const [period, setPeriod] = useState<VisitorPeriod>(initial.period)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [report, setReport] = useState(initial)
  const [loading, setLoading] = useState(false)
  const skipFirst = useRef(true)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ period, from, to })
    fetch(`/api/admin/visitors?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.data?.series) {
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
  }, [period, from, to])

  const peak = useMemo(() => {
    return report.series.reduce((best, point) => (point.visitors > best.visitors ? point : best), report.series[0] || { date: '', visitors: 0, pageviews: 0 })
  }, [report.series])
  const today = kenyaToday()
  const hasTraffic = report.series.some((point) => point.visitors || point.pageviews)

  function choosePeriod(next: VisitorPeriod) {
    const range = defaultRange(next)
    setPeriod(next)
    setFrom(range.from)
    setTo(range.to)
    setReport((prev) => ({
      ...prev,
      period: next,
      from: range.from,
      to: range.to,
      totals: { visitors: 0, pageviews: 0 },
      series: placeholderSeries(next, range.from, range.to),
    }))
  }

  return (
    <section id="visitors" className="admin-card visitor-report">
      <div className="card-title">
        <div>
          <h3>Visitors</h3>
          <span>Unique browsers, counted once per day. Kenya time.</span>
        </div>
      </div>
      <div className="visitor-toolbar">
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
        <div className="visitor-range">
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
      <div className={`visitor-kpis${loading ? ' is-loading' : ''}`}>
        <div>
          <b>{formatCount(report.totals.visitors)}</b>
          <small>Unique visitors</small>
        </div>
        <div>
          <b>{formatCount(report.totals.pageviews)}</b>
          <small>Page views</small>
        </div>
        <div>
          <b>{formatCount(peak.visitors)}</b>
          <small>Peak {report.period === 'monthly' ? 'month' : report.period === 'weekly' ? 'week' : 'day'}{peak.visitors && peak.date ? ` · ${visitorLabel(report.period, peak.date)}` : ''}</small>
        </div>
      </div>
      <VisitorChart period={report.period} series={report.series} />
      {!hasTraffic && <p className="visitor-empty">No visits in this range yet.</p>}
      <div className="visitor-table-wrap">
        <table className="visitor-table">
          <thead>
            <tr>
              <th>{report.period === 'monthly' ? 'Month' : report.period === 'weekly' ? 'Week' : 'Date'}</th>
              <th>Visitors</th>
              <th>Page views</th>
            </tr>
          </thead>
          <tbody>
            {[...report.series].reverse().map((row) => (
              <tr key={row.date}>
                <td>{visitorLabel(report.period, row.date)}</td>
                <td>{formatCount(row.visitors)}</td>
                <td>{formatCount(row.pageviews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
