import { createHash } from 'node:crypto'
import { matchKenyaCounty, type KenyaCounty } from '@/lib/kenya-counties'

export type LocationStatus = 'estimated' | 'unknown' | 'outside_kenya'

export type GeoAttribution = {
  county: KenyaCounty | null
  locationStatus: LocationStatus
  countryCode: string
}

type CacheEntry = { at: number; value: GeoAttribution }

const cache = new Map<string, CacheEntry>()
const CACHE_MS = 24 * 60 * 60 * 1000
const MAX_CACHE = 4000

function hashIp(ip: string) {
  return createHash('sha256').update(ip).digest('hex').slice(0, 24)
}

export function clientIpFromHeaders(headers: { get(name: string): string | null }) {
  const forwarded = headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0]?.trim() || headers.get('x-real-ip') || ''
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
    return ''
  }
  return ip
}

function fromCache(key: string) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function remember(key: string, value: GeoAttribution) {
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  cache.set(key, { at: Date.now(), value })
}

async function lookupRemote(ip: string): Promise<{ countryCode: string; region: string; city: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,region,city`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = await response.json() as { success?: boolean; country_code?: string; region?: string; city?: string }
    if (payload.success === false) return null
    return {
      countryCode: String(payload.country_code || '').toUpperCase(),
      region: String(payload.region || ''),
      city: String(payload.city || ''),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function attributeKenyaLocation(ip: string): Promise<GeoAttribution> {
  if (!ip) return { county: null, locationStatus: 'unknown', countryCode: '' }
  const key = hashIp(ip)
  const cached = fromCache(key)
  if (cached) return cached
  const remote = await lookupRemote(ip)
  if (!remote) {
    const value = { county: null, locationStatus: 'unknown' as const, countryCode: '' }
    remember(key, value)
    return value
  }
  if (remote.countryCode && remote.countryCode !== 'KE') {
    const value = { county: null, locationStatus: 'outside_kenya' as const, countryCode: remote.countryCode }
    remember(key, value)
    return value
  }
  const county = matchKenyaCounty(remote.region, remote.city)
  const value: GeoAttribution = {
    county,
    locationStatus: county ? 'estimated' : 'unknown',
    countryCode: remote.countryCode || 'KE',
  }
  remember(key, value)
  return value
}

export function parseUserAgent(ua: string) {
  const text = String(ua || '')
  const mobile = /Mobile|Android|iPhone|iPod/i.test(text)
  const tablet = /iPad|Tablet|PlayBook/i.test(text) || (/Android/i.test(text) && !/Mobile/i.test(text))
  const deviceType = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop'
  const browser = /Edg\//.test(text)
    ? 'Edge'
    : /OPR\//.test(text)
      ? 'Opera'
      : /Chrome\//.test(text)
        ? 'Chrome'
        : /Safari\//.test(text) && !/Chrome\//.test(text)
          ? 'Safari'
          : /Firefox\//.test(text)
            ? 'Firefox'
            : 'Other'
  const operatingSystem = /Windows/i.test(text)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(text)
      ? 'macOS'
      : /Android/i.test(text)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(text)
          ? 'iOS'
          : /Linux/i.test(text)
            ? 'Linux'
            : 'Other'
  return { deviceType, browser, operatingSystem }
}

export function classifyTrafficSource(referrer: string, landingPath: string) {
  const host = (() => {
    try {
      return referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''
    } catch {
      return ''
    }
  })()
  const params = (() => {
    try {
      return new URL(landingPath, 'https://accordmedical.co.ke').searchParams
    } catch {
      return new URLSearchParams()
    }
  })()
  const utm = (params.get('utm_source') || '').toLowerCase()
  const medium = (params.get('utm_medium') || '').toLowerCase()
  if (utm === 'email' || medium === 'email') return 'email'
  if (utm === 'cpc' || medium === 'cpc' || medium === 'ppc' || medium === 'paid') return 'paid'
  if (/facebook|instagram|tiktok|twitter|x\.com|linkedin|youtube|whatsapp/.test(`${utm} ${host}`)) return 'social'
  if (/google\.|bing\.|yahoo\.|duckduckgo\./.test(host)) return 'organic'
  if (host && !/accordmedical\.co\.ke$/.test(host)) return 'referral'
  if (!host) return 'direct'
  return 'unknown'
}

export function classifyPage(path: string) {
  const clean = String(path || '/').split('?')[0] || '/'
  if (clean === '/') return 'home'
  if (clean.startsWith('/product/')) return 'product'
  if (clean.startsWith('/category/')) return 'category'
  if (clean.startsWith('/products')) return 'listing'
  if (clean.startsWith('/cart') || clean.includes('get-quote')) return 'cart'
  if (clean.startsWith('/checkout')) return 'checkout'
  if (clean.startsWith('/account')) return 'account'
  if (clean.startsWith('/offers')) return 'offer'
  return 'informational'
}

export function sanitizePath(path: string) {
  const raw = String(path || '/').trim() || '/'
  try {
    const url = new URL(raw, 'https://accordmedical.co.ke')
    url.searchParams.delete('token')
    url.searchParams.delete('phone')
    url.searchParams.delete('email')
    url.searchParams.delete('password')
    const query = url.searchParams.toString()
    return `${url.pathname}${query ? `?${query}` : ''}`.slice(0, 255)
  } catch {
    return raw.split('?')[0].slice(0, 255) || '/'
  }
}

export const ANALYTICS_EVENTS = new Set([
  'page_view',
  'session_start',
  'session_end',
  'view_item',
  'search',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'select_category',
  'filter_products',
  'click_banner',
  'wishlist_add',
  'wishlist_remove',
  'login',
  'signup',
  'contact_click',
  'share_product',
  'file_download',
])
