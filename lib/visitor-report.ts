export type VisitorPeriod = 'daily' | 'weekly' | 'monthly'

export type VisitorPoint = {
  date: string
  visitors: number
  pageviews: number
  newVisitors: number
}

export type VisitorTotals = {
  visitors: number
  pageviews: number
  newVisitors: number
}

export type VisitorReport = {
  period: VisitorPeriod
  from: string
  to: string
  today: VisitorPoint
  totals: VisitorTotals
  series: VisitorPoint[]
}

export type VisitorChartMetric = 'pageviews' | 'visitors'

export function emptyVisitorPoint(date: string): VisitorPoint {
  return { date, visitors: 0, pageviews: 0, newVisitors: 0 }
}

export function emptyVisitorTotals(): VisitorTotals {
  return { visitors: 0, pageviews: 0, newVisitors: 0 }
}

export function returningVisitors(point: { visitors: number; newVisitors: number }) {
  return Math.max(0, point.visitors - point.newVisitors)
}

export function visitorMetricValue(point: VisitorPoint, metric: VisitorChartMetric) {
  return metric === 'visitors' ? point.visitors : point.pageviews
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_SPAN_DAYS = 731

export function kenyaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

export function isIsoDate(value: string) {
  if (!DATE.test(value)) return false
  const date = parseKenya(value)
  return kenyaDate(date) === value
}

function parseKenya(iso: string) {
  return new Date(`${iso}T12:00:00+03:00`)
}

export function kenyaDate(value: Date) {
  return value.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

export function addKenyaDays(iso: string, days: number) {
  const date = parseKenya(iso)
  date.setDate(date.getDate() + days)
  return kenyaDate(date)
}

export function weekStart(iso: string) {
  const date = parseKenya(iso)
  const weekday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - weekday)
  return kenyaDate(date)
}

export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`
}

export function defaultRange(period: VisitorPeriod, today = kenyaToday()) {
  if (period === 'weekly') return { from: addKenyaDays(weekStart(today), -7 * 11), to: today }
  if (period === 'monthly') {
    const start = parseKenya(monthStart(today))
    start.setMonth(start.getMonth() - 11)
    return { from: kenyaDate(start), to: today }
  }
  return { from: addKenyaDays(today, -29), to: today }
}

export function clampRange(from: string, to: string, today = kenyaToday()) {
  let start = isIsoDate(from) ? from : addKenyaDays(today, -29)
  let end = isIsoDate(to) ? to : today
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  if (end > today) end = today
  let span = 0
  for (let cursor = start; cursor < end && span < MAX_SPAN_DAYS; span += 1) {
    cursor = addKenyaDays(cursor, 1)
  }
  if (span >= MAX_SPAN_DAYS) start = addKenyaDays(end, -(MAX_SPAN_DAYS - 1))
  return { from: start, to: end }
}

export function parsePeriod(value: unknown): VisitorPeriod {
  return value === 'weekly' || value === 'monthly' ? value : 'daily'
}

export function fillVisitorSeries(period: VisitorPeriod, from: string, to: string, rows: VisitorPoint[]): VisitorPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, {
    date: row.date,
    visitors: Number(row.visitors) || 0,
    pageviews: Number(row.pageviews) || 0,
    newVisitors: Number(row.newVisitors) || 0,
  }]))
  const series: VisitorPoint[] = []
  if (period === 'monthly') {
    let cursor = monthStart(from)
    const last = monthStart(to)
    while (cursor <= last) {
      series.push(byDate.get(cursor) || emptyVisitorPoint(cursor))
      const next = parseKenya(cursor)
      next.setMonth(next.getMonth() + 1)
      cursor = kenyaDate(next)
    }
    return series
  }
  if (period === 'weekly') {
    let cursor = weekStart(from)
    const last = weekStart(to)
    while (cursor <= last) {
      series.push(byDate.get(cursor) || emptyVisitorPoint(cursor))
      cursor = addKenyaDays(cursor, 7)
    }
    return series
  }
  let cursor = from
  while (cursor <= to) {
    series.push(byDate.get(cursor) || emptyVisitorPoint(cursor))
    cursor = addKenyaDays(cursor, 1)
  }
  return series
}

export function visitorLabel(period: VisitorPeriod, iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] || iso
  if (period === 'monthly') return `${monthLabel} ${year}`
  if (period === 'weekly') {
    const end = addKenyaDays(iso, 6)
    const [, endMonth, endDay] = end.split('-').map(Number)
    const endLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][endMonth - 1] || end
    return `${day} ${monthLabel} – ${endDay} ${endLabel}`
  }
  return `${day} ${monthLabel}`
}

export function emptyVisitorReport(period: VisitorPeriod = 'daily'): VisitorReport {
  const today = kenyaToday()
  const range = defaultRange(period, today)
  return {
    period,
    from: range.from,
    to: range.to,
    today: emptyVisitorPoint(today),
    totals: emptyVisitorTotals(),
    series: fillVisitorSeries(period, range.from, range.to, []),
  }
}
