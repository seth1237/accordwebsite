import { kenyaToday, addKenyaDays, isIsoDate } from '@/lib/visitor-report'
import { KENYA_COUNTIES } from '@/lib/kenya-counties'

export const KENYA_ANALYTICS_TZ = 'Africa/Nairobi'
export const ENGAGED_SESSION_SECONDS = 10
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000
export const ANALYTICS_RETENTION_DAYS = 730

export type AnalyticsRangeKey = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m' | 'custom'

export type AnalyticsRange = {
  key: AnalyticsRangeKey
  start: string
  end: string
}

export type CountyTotals = {
  code: string
  name: string
  visitors: number
  sessions: number
  pageViews: number
  newVisitors: number
  returningVisitors: number
  productViews: number
  addToCart: number
  avgSessionSeconds: number
  engagementRate: number
}

export type AnalyticsOverview = {
  range: AnalyticsRange
  updatedAt: string
  totalVisitors: number
  totalSessions: number
  totalPageViews: number
  returningVisitors: number
  newVisitors: number
  countiesReached: number
  productViews: number
  addToCart: number
  avgSessionSeconds: number
  engagementRate: number
  bounceRate: number
  unknownVisitors: number
  outsideKenyaVisitors: number
  counties: CountyTotals[]
  devices: { mobile: number; desktop: number; tablet: number }
  trafficSources: Array<{ source: string; sessions: number }>
  series: Array<{ date: string; visitors: number; pageViews: number; newVisitors: number; returningVisitors: number }>
  topProducts: Array<{ productId: string; name: string; views: number; carts: number }>
  hourly: Array<{ hour: number; visitors: number }>
}

export type CountyDetail = {
  county: { code: string; name: string }
  period: { start: string; end: string }
  visitors: { total: number; new: number; returning: number }
  sessions: number
  pageViews: number
  averageSessionDuration: number
  engagementRate: number
  bounceRate: number
  pagesPerSession: number
  productViews: number
  addToCartEvents: number
  devices: { mobile: number; desktop: number; tablet: number }
  locationStatus: 'estimated'
  pages: Array<{ path: string; views: number }>
  products: Array<{ productId: string; name: string; views: number; carts: number; shares: number }>
  searches: Array<{ term: string; count: number }>
  categories: Array<{ name: string; views: number }>
  features: Array<{ event: string; count: number }>
  paths: Array<{ from: string; to: string; count: number }>
  trafficSources: Array<{ source: string; sessions: number }>
  series: Array<{ date: string; visitors: number; pageViews: number; newVisitors: number; returningVisitors: number }>
  hourly: Array<{ hour: number; visitors: number }>
}

export function emptyCountyTotals(code: string, name: string): CountyTotals {
  return {
    code,
    name,
    visitors: 0,
    sessions: 0,
    pageViews: 0,
    newVisitors: 0,
    returningVisitors: 0,
    productViews: 0,
    addToCart: 0,
    avgSessionSeconds: 0,
    engagementRate: 0,
  }
}

export function allCountyShell(): CountyTotals[] {
  return KENYA_COUNTIES.map((county) => emptyCountyTotals(county.code, county.name))
}

export function parseAnalyticsRange(input: {
  range?: string
  start?: string
  end?: string
}): AnalyticsRange {
  const key = (input.range || '30d') as AnalyticsRangeKey
  const today = kenyaToday()
  if (key === 'today') return { key, start: today, end: today }
  if (key === 'yesterday') {
    const day = addKenyaDays(today, -1)
    return { key, start: day, end: day }
  }
  if (key === '7d') return { key, start: addKenyaDays(today, -6), end: today }
  if (key === '90d') return { key, start: addKenyaDays(today, -89), end: today }
  if (key === '12m') return { key, start: addKenyaDays(today, -364), end: today }
  if (key === 'custom' && isIsoDate(input.start || '') && isIsoDate(input.end || '')) {
    const start = input.start! <= input.end! ? input.start! : input.end!
    const end = input.start! <= input.end! ? input.end! : input.start!
    return { key, start, end }
  }
  return { key: key === '30d' ? '30d' : '30d', start: addKenyaDays(today, -29), end: today }
}

export function rangeBoundsUtc(range: AnalyticsRange) {
  return {
    start: new Date(`${range.start}T00:00:00+03:00`),
    end: new Date(`${range.end}T23:59:59.999+03:00`),
  }
}

export function pct(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

export function formatDuration(seconds: number) {
  const value = Math.max(0, Math.round(seconds))
  const mins = Math.floor(value / 60)
  const secs = value % 60
  if (mins < 1) return `${secs}s`
  return `${mins}m ${secs}s`
}
