'use client'

const VISITOR_KEY = 'accord_vid'
const SESSION_KEY = 'accord_sid'
const SESSION_AT = 'accord_sid_at'
const TIMEOUT_MS = 30 * 60 * 1000

type AnalyticsEvent = {
  id?: string
  type: string
  path?: string
  title?: string
  productId?: string
  productName?: string
  searchTerm?: string
  referrer?: string
  timeOnPageSeconds?: number
}

let queue: AnalyticsEvent[] = []
let timer: number | null = null
let lastPath = ''
let lastSeen = Date.now()

function randomId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

function read(key: string, storage: Storage | null) {
  try {
    return storage?.getItem(key) || ''
  } catch {
    return ''
  }
}

function write(key: string, value: string, storage: Storage | null) {
  try {
    storage?.setItem(key, value)
  } catch {}
}

function cookieGet(name: string) {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function cookieSet(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
}

export function analyticsVisitorId() {
  if (typeof window === 'undefined') return ''
  const fromCookie = cookieGet(VISITOR_KEY)
  const existing = fromCookie || read(VISITOR_KEY, window.localStorage)
  if (existing) {
    write(VISITOR_KEY, existing, window.localStorage)
    cookieSet(VISITOR_KEY, existing, 60 * 60 * 24 * 400)
    return existing
  }
  const created = randomId()
  write(VISITOR_KEY, created, window.localStorage)
  cookieSet(VISITOR_KEY, created, 60 * 60 * 24 * 400)
  return created
}

export function analyticsSessionId() {
  if (typeof window === 'undefined') return ''
  const now = Date.now()
  const last = Number(read(SESSION_AT, window.sessionStorage) || 0)
  let id = read(SESSION_KEY, window.sessionStorage)
  if (!id || (last && now - last > TIMEOUT_MS)) {
    id = randomId()
    write(SESSION_KEY, id, window.sessionStorage)
  }
  write(SESSION_AT, String(now), window.sessionStorage)
  return id
}

function flush() {
  if (!queue.length || typeof window === 'undefined') return
  const events = queue.splice(0, 30)
  const visitorId = analyticsVisitorId()
  const sessionId = analyticsSessionId()
  if (!visitorId || !sessionId) return
  const pageview = events.find((item) => item.type === 'page_view')
  void fetch('/api/analytics/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      sessionId,
      referrer: document.referrer || '',
      landingPath: `${window.location.pathname}${window.location.search}`,
      pageview: pageview || undefined,
      events: events.filter((item) => item.type !== 'page_view'),
    }),
    keepalive: true,
  }).catch(() => null)
}

function schedule() {
  if (timer != null) return
  timer = window.setTimeout(() => {
    timer = null
    flush()
  }, 400)
}

export function trackAnalytics(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/admin')) return
  queue.push({ ...event, id: event.id || randomId(), path: event.path || window.location.pathname })
  schedule()
}

export function trackPageView(path: string, title: string) {
  const now = Date.now()
  if (lastPath && lastPath !== path) {
    trackAnalytics({
      type: 'page_view',
      path: lastPath,
      title,
      timeOnPageSeconds: Math.round((now - lastSeen) / 1000),
    })
  } else {
    trackAnalytics({ type: 'page_view', path, title })
  }
  lastPath = path
  lastSeen = now
  if (path.startsWith('/category/')) trackAnalytics({ type: 'select_category', path })
  if (path.startsWith('/cart') || path.includes('get-quote')) trackAnalytics({ type: 'view_cart', path })
  if (path.startsWith('/checkout')) trackAnalytics({ type: 'begin_checkout', path })
  if (path === '/account/login') trackAnalytics({ type: 'login', path })
  if (path === '/account/register') trackAnalytics({ type: 'signup', path })
}

export function endAnalyticsSession() {
  if (lastPath) {
    trackAnalytics({
      type: 'page_view',
      path: lastPath,
      title: typeof document === 'undefined' ? '' : document.title,
      timeOnPageSeconds: Math.round((Date.now() - lastSeen) / 1000),
    })
  }
  trackAnalytics({ type: 'session_end', path: lastPath || '/' })
  flush()
}
