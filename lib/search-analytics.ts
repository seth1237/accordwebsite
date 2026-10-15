import {
  addKenyaDays,
  clampRange,
  defaultRange,
  fillVisitorSeries,
  parsePeriod,
  type VisitorPeriod,
} from '@/lib/visitor-report'

export type SearchTrigger = 'idle' | 'blur' | 'pagehide' | 'submit' | 'result'
export type SearchSource = 'live' | 'error'
export type SearchKind = 'all' | 'matched' | 'unmet'

export type SearchEventInput = {
  query: string
  resultCount: number
  catalogReady: boolean
  trigger: SearchTrigger
  path?: string
  visitorId?: string
  sessionId?: string
  productId?: string
}

export type SearchHistoryRow = {
  id: string
  query: string
  resultCount: number
  matched: boolean
  source: SearchSource
  trigger: SearchTrigger
  path: string
  createdAt: string
  eventLabel: string
  activityLabel: string
}

export type SearchDemandRow = {
  query: string
  searches: number
  sessions: number
  resultCount: number
  lastAt: string
  activityLabel: string
}

export type SearchReport = {
  period: VisitorPeriod
  from: string
  to: string
  totals: {
    searches: number
    uniqueQueries: number
    uniqueSessions: number
    matched: number
    unmatched: number
  }
  series: Array<{ date: string; searches: number; matched: number; unmatched: number }>
  unmet: SearchDemandRow[]
  matched: SearchDemandRow[]
  history: SearchHistoryRow[]
}

const QUERY_MAX = 120

export function normalizeSearchQuery(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, QUERY_MAX)
}

export function searchQueryKey(value: unknown) {
  return normalizeSearchQuery(value).toLowerCase()
}

export function isPrefixSearchUpdate(previous: string, next: string) {
  if (!previous || !next) return false
  return next.startsWith(previous) || previous.startsWith(next)
}

export function searchEventLabel(matched: boolean, source: string) {
  if (source === 'error') return 'Search unavailable'
  return matched ? 'Catalogue match' : 'Unfulfilled search'
}

export function searchActivityLabel(trigger: string) {
  if (trigger === 'blur') return 'Left the search bar'
  if (trigger === 'pagehide') return 'Left the page'
  if (trigger === 'submit') return 'Opened search results'
  if (trigger === 'result') return 'Opened a product'
  return 'Client stopped typing'
}

export function parseSearchKind(value: unknown): SearchKind {
  return value === 'matched' || value === 'unmet' ? value : 'all'
}

export function emptySearchReport(period: VisitorPeriod = 'daily'): SearchReport {
  const range = defaultRange(period)
  return {
    period,
    from: range.from,
    to: range.to,
    totals: { searches: 0, uniqueQueries: 0, uniqueSessions: 0, matched: 0, unmatched: 0 },
    series: fillVisitorSeries(period, range.from, range.to, []).map((point) => ({
      date: point.date,
      searches: 0,
      matched: 0,
      unmatched: 0,
    })),
    unmet: [],
    matched: [],
    history: [],
  }
}

export function searchRange(period: VisitorPeriod, from?: string, to?: string) {
  const fallback = defaultRange(period)
  return clampRange(from || fallback.from, to || fallback.to)
}

export function fillSearchSeries(
  period: VisitorPeriod,
  from: string,
  to: string,
  rows: Array<{ date: string; searches: number; matched: number; unmatched: number }>,
) {
  const byDate = new Map(rows.map((row) => [row.date, row]))
  return fillVisitorSeries(period, from, to, []).map((point) => {
    const hit = byDate.get(point.date)
    return {
      date: point.date,
      searches: hit?.searches || 0,
      matched: hit?.matched || 0,
      unmatched: hit?.unmatched || 0,
    }
  })
}

export function addSearchDays(iso: string, days: number) {
  return addKenyaDays(iso, days)
}

function excelSheet(name: string, header: string[], rows: string[][]) {
  const table = [header, ...rows]
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
          .join('')}</Row>`,
    )
    .join('')
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${table}</Table></Worksheet>`
}

function demandExcelRows(rows: SearchDemandRow[]) {
  return rows.map((row) => [
    row.query,
    String(row.sessions),
    String(row.searches),
    String(row.resultCount),
    row.activityLabel,
    row.lastAt,
  ])
}

export function searchEventsToExcelXml(rows: SearchHistoryRow[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${excelSheet('Search history', ['Search query', 'Matching products', 'Event', 'Last activity', 'When'], rows.map((row) => [
    row.query,
    String(row.resultCount),
    row.eventLabel,
    row.activityLabel,
    row.createdAt,
  ]))}
</Workbook>`
}

export function searchReportToExcelXml(report: SearchReport) {
  const demandHeader = ['Search query', 'Unique sessions', 'Searches', 'Matching products', 'Last activity', 'Last seen']
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${excelSheet('Summary', ['Metric', 'Value'], [
    ['Period', report.period],
    ['From', report.from],
    ['To', report.to],
    ['Searches', String(report.totals.searches)],
    ['Unique queries', String(report.totals.uniqueQueries)],
    ['Unique sessions', String(report.totals.uniqueSessions)],
    ['In the catalogue', String(report.totals.matched)],
    ['Unfulfilled demand', String(report.totals.unmatched)],
  ])}
  ${excelSheet('Unfulfilled demand', demandHeader, demandExcelRows(report.unmet))}
  ${excelSheet('In the catalogue', demandHeader, demandExcelRows(report.matched))}
  ${excelSheet('Trends', ['Date', 'Searches', 'In the catalogue', 'Unfulfilled'], report.series.map((row) => [
    row.date,
    String(row.searches),
    String(row.matched),
    String(row.unmatched),
  ]))}
  ${excelSheet('Search history', ['Search query', 'Matching products', 'Event', 'Last activity', 'When'], report.history.map((row) => [
    row.query,
    String(row.resultCount),
    row.eventLabel,
    row.activityLabel,
    row.createdAt,
  ]))}
</Workbook>`
}

function xmlEscape(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { parsePeriod }
