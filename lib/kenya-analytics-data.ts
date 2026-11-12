import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { KENYA_COUNTIES, countyByCode } from '@/lib/kenya-counties'
import {
  ANALYTICS_RETENTION_DAYS,
  ENGAGED_SESSION_SECONDS,
  emptyCountyTotals,
  pct,
  rangeBoundsUtc,
  type AnalyticsOverview,
  type AnalyticsRange,
  type CountyDetail,
  type CountyTotals,
} from '@/lib/kenya-analytics'
import { ANALYTICS_EVENTS, attributeKenyaLocation, classifyPage, classifyTrafficSource, parseUserAgent, sanitizePath } from '@/lib/kenya-geo'
import { withMysqlPool } from '@/lib/mysql'

export async function applyKenyaAnalyticsSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_counties (
      id TINYINT UNSIGNED NOT NULL,
      county_code CHAR(2) NOT NULL,
      county_name VARCHAR(100) NOT NULL,
      geometry_id VARCHAR(32) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY county_code (county_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_ki_visitors (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      anonymous_id VARCHAR(64) NOT NULL,
      first_seen_at DATETIME NOT NULL,
      last_seen_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY anonymous_id (anonymous_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_ki_sessions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      visitor_id INT UNSIGNED NOT NULL,
      session_key VARCHAR(64) NOT NULL,
      county_id TINYINT UNSIGNED NULL,
      location_status VARCHAR(24) NOT NULL DEFAULT 'unknown',
      country_code CHAR(2) NOT NULL DEFAULT '',
      device_type VARCHAR(16) NOT NULL DEFAULT 'desktop',
      browser VARCHAR(32) NOT NULL DEFAULT '',
      operating_system VARCHAR(32) NOT NULL DEFAULT '',
      traffic_source VARCHAR(32) NOT NULL DEFAULT 'direct',
      started_at DATETIME NOT NULL,
      last_activity_at DATETIME NOT NULL,
      ended_at DATETIME NULL,
      page_count INT NOT NULL DEFAULT 0,
      duration_seconds INT NOT NULL DEFAULT 0,
      engaged TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY session_key (session_key),
      KEY visitor_started (visitor_id, started_at),
      KEY county_started (county_id, started_at),
      KEY status_started (location_status, started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_ki_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      event_key VARCHAR(64) NOT NULL,
      visitor_id INT UNSIGNED NOT NULL,
      session_id INT UNSIGNED NOT NULL,
      event_type VARCHAR(40) NOT NULL,
      page_path VARCHAR(255) NOT NULL DEFAULT '',
      page_category VARCHAR(32) NOT NULL DEFAULT '',
      product_id VARCHAR(80) NOT NULL DEFAULT '',
      product_name VARCHAR(191) NOT NULL DEFAULT '',
      search_term VARCHAR(120) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY event_key (event_key),
      KEY session_created (session_id, created_at),
      KEY type_created (event_type, created_at),
      KEY product_created (product_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_ki_page_views (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      visitor_id INT UNSIGNED NOT NULL,
      session_id INT UNSIGNED NOT NULL,
      county_id TINYINT UNSIGNED NULL,
      page_path VARCHAR(255) NOT NULL,
      page_title VARCHAR(191) NOT NULL DEFAULT '',
      page_category VARCHAR(32) NOT NULL DEFAULT '',
      referrer VARCHAR(255) NOT NULL DEFAULT '',
      time_on_page_seconds INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY session_created (session_id, created_at),
      KEY county_created (county_id, created_at),
      KEY path_created (page_path, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  const now = new Date()
  for (const county of KENYA_COUNTIES) {
    await pool.query(
      `INSERT IGNORE INTO accord_nx_counties (id, county_code, county_name, geometry_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      [county.id, county.code, county.name, county.code, now],
    )
  }
}

function anonId(value: string) {
  const id = String(value || '').trim()
  return /^[a-z0-9-]{8,64}$/i.test(id) ? id : ''
}

function eventKey(value: string) {
  const id = String(value || '').trim()
  return /^[a-z0-9-]{8,80}$/i.test(id) ? id : ''
}

function stripSensitive(data: Record<string, unknown>) {
  const blocked = /price|total|amount|mpesa|phone|email|password|token|card|checkout_id/i
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(data)) {
    if (blocked.test(key)) continue
    if (typeof value === 'string') out[key] = value.slice(0, 180)
    else if (typeof value === 'number' || typeof value === 'boolean') out[key] = value
  }
  return out
}

async function visitorRow(pool: Pool, anonymousId: string, now: Date) {
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id, first_seen_at FROM accord_nx_ki_visitors WHERE anonymous_id = ? LIMIT 1',
    [anonymousId],
  )
  if (existing[0]) {
    await pool.query('UPDATE accord_nx_ki_visitors SET last_seen_at = ? WHERE id = ?', [now, existing[0].id])
    return { id: Number(existing[0].id), firstSeenAt: new Date(existing[0].first_seen_at) }
  }
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO accord_nx_ki_visitors (anonymous_id, first_seen_at, last_seen_at, created_at) VALUES (?, ?, ?, ?)',
    [anonymousId, now, now, now],
  )
  return { id: result.insertId, firstSeenAt: now }
}

function isEngaged(pageCount: number, durationSeconds: number, meaningful: boolean) {
  return durationSeconds > ENGAGED_SESSION_SECONDS || pageCount >= 2 || meaningful ? 1 : 0
}

const MEANINGFUL = new Set(['view_item', 'add_to_cart', 'search', 'begin_checkout', 'view_cart', 'file_download', 'share_product'])

export async function recordKenyaAnalytics(input: {
  ip: string
  userAgent: string
  visitorId: string
  sessionId: string
  events?: Array<Record<string, unknown>>
  pageview?: Record<string, unknown>
  referrer?: string
  landingPath?: string
}) {
  const visitorKey = anonId(input.visitorId)
  const sessionKey = anonId(input.sessionId)
  if (!visitorKey || !sessionKey) return { ok: false }
  return withMysqlPool(async (pool) => {
    const now = new Date()
    const visitor = await visitorRow(pool, visitorKey, now)
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM accord_nx_ki_sessions WHERE session_key = ? LIMIT 1',
      [sessionKey],
    )
    let session = sessionRows[0]
    if (!session) {
      const geo = await attributeKenyaLocation(input.ip)
      const ua = parseUserAgent(input.userAgent)
      const source = classifyTrafficSource(input.referrer || '', input.landingPath || '')
      const [created] = await pool.query<ResultSetHeader>(
        `INSERT INTO accord_nx_ki_sessions
          (visitor_id, session_key, county_id, location_status, country_code, device_type, browser, operating_system, traffic_source, started_at, last_activity_at, page_count, duration_seconds, engaged, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
        [
          visitor.id,
          sessionKey,
          geo.county?.id || null,
          geo.locationStatus,
          geo.countryCode.slice(0, 2),
          ua.deviceType,
          ua.browser,
          ua.operatingSystem,
          source,
          now,
          now,
          now,
        ],
      )
      const eventKeyValue = eventKey(`${sessionKey}-start`) || `${sessionKey}-start`.slice(0, 64)
      await pool.query(
        `INSERT IGNORE INTO accord_nx_ki_events (event_key, visitor_id, session_id, event_type, page_path, page_category, created_at)
         VALUES (?, ?, ?, 'session_start', ?, 'session', ?)`,
        [eventKeyValue, visitor.id, created.insertId, sanitizePath(input.landingPath || '/'), now],
      )
      const [fresh] = await pool.query<RowDataPacket[]>('SELECT * FROM accord_nx_ki_sessions WHERE id = ? LIMIT 1', [created.insertId])
      session = fresh[0]
    }

    const sessionId = Number(session.id)
    const countyId = session.county_id == null ? null : Number(session.county_id)
    const events = Array.isArray(input.events) ? input.events.slice(0, 30) : []
    if (input.pageview) events.unshift({ type: 'page_view', ...input.pageview })
    let pageCount = Number(session.page_count) || 0
    let meaningful = Boolean(session.engaged)
    let lastPath = ''

    for (const raw of events) {
      const type = String(raw.type || raw.event_type || '')
      if (!ANALYTICS_EVENTS.has(type)) continue
      const key = eventKey(String(raw.id || raw.event_key || '')) || `${sessionKey}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const path = sanitizePath(String(raw.path || raw.page_path || input.landingPath || '/'))
      const category = classifyPage(path)
      const productId = String(raw.productId || raw.product_id || '').slice(0, 80)
      const productName = String(raw.productName || raw.product_name || '').slice(0, 191)
      const searchTerm = String(raw.searchTerm || raw.search_term || raw.query || '').slice(0, 120)
      void stripSensitive(typeof raw.data === 'object' && raw.data ? raw.data as Record<string, unknown> : {})
      const [insert] = await pool.query<ResultSetHeader>(
        `INSERT IGNORE INTO accord_nx_ki_events
          (event_key, visitor_id, session_id, event_type, page_path, page_category, product_id, product_name, search_term, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [key, visitor.id, sessionId, type, path, category, productId, productName, searchTerm, now],
      )
      if (!insert.affectedRows) continue
      if (MEANINGFUL.has(type)) meaningful = true
      if (type === 'page_view') {
        pageCount += 1
        lastPath = path
        const title = String(raw.title || raw.page_title || '').slice(0, 191)
        const referrer = String(raw.referrer || input.referrer || '').slice(0, 255)
        const dwell = Math.max(0, Math.min(3600, Number(raw.timeOnPageSeconds) || 0))
        await pool.query(
          `INSERT INTO accord_nx_ki_page_views
            (visitor_id, session_id, county_id, page_path, page_title, page_category, referrer, time_on_page_seconds, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [visitor.id, sessionId, countyId, path, title, category, referrer, dwell, now],
        )
      }
      if (type === 'session_end' && !session.ended_at) {
        await pool.query('UPDATE accord_nx_ki_sessions SET ended_at = ? WHERE id = ?', [now, sessionId])
      }
    }

    const started = new Date(session.started_at)
    const duration = Math.max(0, Math.round((now.getTime() - started.getTime()) / 1000))
    await pool.query(
      `UPDATE accord_nx_ki_sessions
       SET last_activity_at = ?, page_count = ?, duration_seconds = ?, engaged = ?
       WHERE id = ?`,
      [now, pageCount, duration, isEngaged(pageCount, duration, meaningful), sessionId],
    )
    if (Math.random() < 0.02) {
      await pool.query(
        'DELETE FROM accord_nx_ki_events WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
        [ANALYTICS_RETENTION_DAYS],
      ).catch(() => null)
    }
    return { ok: true, path: lastPath }
  })
}

function num(row: RowDataPacket, key: string) {
  return Number(row[key]) || 0
}

function sessionFilterSql(start: Date, end: Date, filters?: { device?: string; visitorType?: string }) {
  const extra: string[] = []
  const extraParams: Array<string | Date> = []
  const device = filters?.device && ['mobile', 'desktop', 'tablet'].includes(filters.device) ? filters.device : ''
  const visitorType = String(filters?.visitorType || '')
  if (device) {
    extra.push('AND s.device_type = ?')
    extraParams.push(device)
  }
  if (visitorType === 'new') {
    extra.push('AND EXISTS (SELECT 1 FROM accord_nx_ki_visitors vx WHERE vx.id = s.visitor_id AND vx.first_seen_at BETWEEN ? AND ?)')
    extraParams.push(start, end)
  } else if (visitorType === 'returning') {
    extra.push('AND EXISTS (SELECT 1 FROM accord_nx_ki_visitors vx WHERE vx.id = s.visitor_id AND vx.first_seen_at < ?)')
    extraParams.push(start)
  } else if (visitorType === 'engaged') extra.push('AND s.engaged = 1')
  else if (visitorType === 'product') extra.push("AND EXISTS (SELECT 1 FROM accord_nx_ki_events e0 WHERE e0.session_id = s.id AND e0.event_type = 'view_item')")
  else if (visitorType === 'cart') extra.push("AND EXISTS (SELECT 1 FROM accord_nx_ki_events e0 WHERE e0.session_id = s.id AND e0.event_type = 'add_to_cart')")
  else if (visitorType === 'search') extra.push("AND EXISTS (SELECT 1 FROM accord_nx_ki_events e0 WHERE e0.session_id = s.id AND e0.event_type = 'search')")
  return { extra: extra.join(' '), extraParams, device }
}

export async function kenyaAnalyticsOverview(range: AnalyticsRange, filters?: { device?: string; visitorType?: string }): Promise<AnalyticsOverview> {
  const { start, end } = rangeBoundsUtc(range)
  return withMysqlPool(async (pool) => {
    const { extra, extraParams } = sessionFilterSql(start, end, filters)
    const params: Array<string | Date> = [start, end, ...extraParams]

    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT
          COUNT(*) AS sessions,
          COUNT(DISTINCT s.visitor_id) AS visitors,
          SUM(s.page_count) AS page_views,
          SUM(s.duration_seconds) AS duration,
          SUM(s.engaged) AS engaged,
          SUM(s.location_status = 'unknown') AS unknown_sessions,
          SUM(s.location_status = 'outside_kenya') AS outside_sessions,
          SUM(s.device_type = 'mobile') AS mobile,
          SUM(s.device_type = 'desktop') AS desktop,
          SUM(s.device_type = 'tablet') AS tablet
        FROM accord_nx_ki_sessions s
        WHERE s.started_at BETWEEN ? AND ? ${extra}`,
      params,
    )
    const totals = sessionRows[0] || {}
    const sessions = num(totals, 'sessions')
    const visitors = num(totals, 'visitors')
    const pageViews = num(totals, 'page_views')
    const engaged = num(totals, 'engaged')

    const [newRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT v.id) AS n
       FROM accord_nx_ki_visitors v
       JOIN accord_nx_ki_sessions s ON s.visitor_id = v.id
       WHERE s.started_at BETWEEN ? AND ? AND v.first_seen_at BETWEEN ? AND ? ${extra}`,
      [start, end, start, end, ...extraParams],
    )
    const newVisitors = num(newRows[0] || {}, 'n')

    const [eventRows] = await pool.query<RowDataPacket[]>(
      `SELECT e.event_type, COUNT(*) AS n
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? ${extra}
       GROUP BY e.event_type`,
      params,
    )
    const eventMap = new Map(eventRows.map((row) => [String(row.event_type), num(row, 'n')]))

    const [sourceRows] = await pool.query<RowDataPacket[]>(
      `SELECT traffic_source AS source, COUNT(*) AS n
       FROM accord_nx_ki_sessions s
       WHERE s.started_at BETWEEN ? AND ? ${extra}
       GROUP BY traffic_source ORDER BY n DESC`,
      params,
    )

    const [countyRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.county_id,
              COUNT(*) AS sessions,
              COUNT(DISTINCT s.visitor_id) AS visitors,
              SUM(s.page_count) AS page_views,
              SUM(s.duration_seconds) AS duration,
              SUM(s.engaged) AS engaged
       FROM accord_nx_ki_sessions s
       WHERE s.started_at BETWEEN ? AND ? AND s.location_status = 'estimated' AND s.county_id IS NOT NULL ${extra}
       GROUP BY s.county_id`,
      params,
    )
    const countyMap = new Map<number, RowDataPacket>()
    for (const row of countyRows) countyMap.set(Number(row.county_id), row)

    const [newCountyRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.county_id, COUNT(DISTINCT v.id) AS n
       FROM accord_nx_ki_sessions s
       JOIN accord_nx_ki_visitors v ON v.id = s.visitor_id
       WHERE s.started_at BETWEEN ? AND ? AND s.location_status = 'estimated' AND s.county_id IS NOT NULL
         AND v.first_seen_at BETWEEN ? AND ? ${extra}
       GROUP BY s.county_id`,
      [start, end, start, end, ...extraParams],
    )
    const newCounty = new Map(newCountyRows.map((row) => [Number(row.county_id), num(row, 'n')]))

    const [productEventRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.county_id, e.event_type, COUNT(*) AS n
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.location_status = 'estimated' AND s.county_id IS NOT NULL
         AND e.event_type IN ('view_item', 'add_to_cart') ${extra}
       GROUP BY s.county_id, e.event_type`,
      params,
    )
    const productByCounty = new Map<string, number>()
    for (const row of productEventRows) {
      productByCounty.set(`${row.county_id}:${row.event_type}`, num(row, 'n'))
    }

    const counties: CountyTotals[] = KENYA_COUNTIES.map((county) => {
      const row = countyMap.get(county.id)
      const shell = emptyCountyTotals(county.code, county.name)
      if (!row) return shell
      const sess = num(row, 'sessions')
      const vis = num(row, 'visitors')
      const neu = newCounty.get(county.id) || 0
      return {
        ...shell,
        visitors: vis,
        sessions: sess,
        pageViews: num(row, 'page_views'),
        newVisitors: neu,
        returningVisitors: Math.max(0, vis - neu),
        productViews: productByCounty.get(`${county.id}:view_item`) || 0,
        addToCart: productByCounty.get(`${county.id}:add_to_cart`) || 0,
        avgSessionSeconds: sess ? num(row, 'duration') / sess : 0,
        engagementRate: pct(num(row, 'engaged'), sess),
      }
    })

    const [seriesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(s.started_at) AS day,
              COUNT(DISTINCT s.visitor_id) AS visitors,
              SUM(s.page_count) AS page_views,
              COUNT(DISTINCT CASE WHEN v.first_seen_at BETWEEN ? AND ? THEN v.id END) AS new_visitors
       FROM accord_nx_ki_sessions s
       JOIN accord_nx_ki_visitors v ON v.id = s.visitor_id
       WHERE s.started_at BETWEEN ? AND ? ${extra}
       GROUP BY day ORDER BY day ASC`,
      [start, end, start, end, ...extraParams],
    )

    const [hourRows] = await pool.query<RowDataPacket[]>(
      `SELECT HOUR(s.started_at) AS hour, COUNT(DISTINCT s.visitor_id) AS visitors
       FROM accord_nx_ki_sessions s
       WHERE s.started_at BETWEEN ? AND ? ${extra}
       GROUP BY hour`,
      params,
    )
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0 }))
    for (const row of hourRows) hours[Number(row.hour) || 0].visitors = num(row, 'visitors')

    const [topProductRows] = await pool.query<RowDataPacket[]>(
      `SELECT e.product_id, MAX(e.product_name) AS name,
              SUM(e.event_type = 'view_item') AS views,
              SUM(e.event_type = 'add_to_cart') AS carts
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND e.product_id <> '' ${extra}
       GROUP BY e.product_id
       ORDER BY views DESC, carts DESC
       LIMIT 10`,
      params,
    )

    const unknownVisitors = await countDistinct(pool, `s.location_status = 'unknown'`, start, end, extra, extraParams)
    const outsideKenyaVisitors = await countDistinct(pool, `s.location_status = 'outside_kenya'`, start, end, extra, extraParams)

    return {
      range,
      updatedAt: new Date().toISOString(),
      totalVisitors: visitors,
      totalSessions: sessions,
      totalPageViews: pageViews,
      returningVisitors: Math.max(0, visitors - newVisitors),
      newVisitors,
      countiesReached: counties.filter((item) => item.visitors > 0).length,
      productViews: eventMap.get('view_item') || 0,
      addToCart: eventMap.get('add_to_cart') || 0,
      avgSessionSeconds: sessions ? num(totals, 'duration') / sessions : 0,
      engagementRate: pct(engaged, sessions),
      bounceRate: pct(sessions - engaged, sessions),
      unknownVisitors,
      outsideKenyaVisitors,
      counties,
      devices: {
        mobile: num(totals, 'mobile'),
        desktop: num(totals, 'desktop'),
        tablet: num(totals, 'tablet'),
      },
      trafficSources: sourceRows.map((row) => ({ source: String(row.source || 'unknown'), sessions: num(row, 'n') })),
      series: seriesRows.map((row) => ({
        date: String(row.day).slice(0, 10),
        visitors: num(row, 'visitors'),
        pageViews: num(row, 'page_views'),
        newVisitors: num(row, 'new_visitors'),
        returningVisitors: Math.max(0, num(row, 'visitors') - num(row, 'new_visitors')),
      })),
      topProducts: topProductRows.map((row) => ({
        productId: String(row.product_id),
        name: String(row.name || row.product_id),
        views: num(row, 'views'),
        carts: num(row, 'carts'),
      })),
      hourly: hours,
    }
  })
}

async function countDistinct(pool: Pool, where: string, start: Date, end: Date, extra: string, extraParams: Array<string | Date>) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT s.visitor_id) AS n FROM accord_nx_ki_sessions s WHERE s.started_at BETWEEN ? AND ? AND ${where} ${extra}`,
    [start, end, ...extraParams],
  )
  return num(rows[0] || {}, 'n')
}

export async function kenyaCountyDetail(code: string, range: AnalyticsRange): Promise<CountyDetail | null> {
  const county = countyByCode(code)
  if (!county) return null
  const { start, end } = rangeBoundsUtc(range)
  return withMysqlPool(async (pool) => {
    const params = [start, end, county.id]
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS sessions, COUNT(DISTINCT visitor_id) AS visitors, SUM(page_count) AS page_views,
              SUM(duration_seconds) AS duration, SUM(engaged) AS engaged,
              SUM(device_type = 'mobile') AS mobile, SUM(device_type = 'desktop') AS desktop, SUM(device_type = 'tablet') AS tablet
       FROM accord_nx_ki_sessions
       WHERE started_at BETWEEN ? AND ? AND county_id = ? AND location_status = 'estimated'`,
      params,
    )
    const totals = sessionRows[0] || {}
    const sessions = num(totals, 'sessions')
    const visitors = num(totals, 'visitors')
    const [newRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT v.id) AS n
       FROM accord_nx_ki_sessions s
       JOIN accord_nx_ki_visitors v ON v.id = s.visitor_id
       WHERE s.started_at BETWEEN ? AND ? AND s.county_id = ? AND s.location_status = 'estimated' AND v.first_seen_at BETWEEN ? AND ?`,
      [start, end, county.id, start, end],
    )
    const neu = num(newRows[0] || {}, 'n')

    const [pages] = await pool.query<RowDataPacket[]>(
      `SELECT page_path, COUNT(*) AS n FROM accord_nx_ki_page_views
       WHERE created_at BETWEEN ? AND ? AND county_id = ?
       GROUP BY page_path ORDER BY n DESC LIMIT 12`,
      params,
    )
    const [products] = await pool.query<RowDataPacket[]>(
      `SELECT e.product_id, MAX(e.product_name) AS name,
              SUM(e.event_type = 'view_item') AS views,
              SUM(e.event_type = 'add_to_cart') AS carts,
              SUM(e.event_type = 'share_product') AS shares
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.county_id = ? AND e.product_id <> ''
       GROUP BY e.product_id ORDER BY views DESC LIMIT 12`,
      params,
    )
    const [searches] = await pool.query<RowDataPacket[]>(
      `SELECT e.search_term AS term, COUNT(*) AS n
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.county_id = ? AND e.event_type = 'search' AND e.search_term <> ''
       GROUP BY e.search_term ORDER BY n DESC LIMIT 12`,
      params,
    )
    const [categories] = await pool.query<RowDataPacket[]>(
      `SELECT e.page_path, COUNT(*) AS n
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.county_id = ? AND e.event_type IN ('select_category', 'page_view') AND e.page_category = 'category'
       GROUP BY e.page_path ORDER BY n DESC LIMIT 10`,
      params,
    )
    const [features] = await pool.query<RowDataPacket[]>(
      `SELECT e.event_type, COUNT(*) AS n
       FROM accord_nx_ki_events e
       JOIN accord_nx_ki_sessions s ON s.id = e.session_id
       WHERE e.created_at BETWEEN ? AND ? AND s.county_id = ?
       GROUP BY e.event_type ORDER BY n DESC`,
      params,
    )
    const [sources] = await pool.query<RowDataPacket[]>(
      `SELECT traffic_source AS source, COUNT(*) AS n FROM accord_nx_ki_sessions
       WHERE started_at BETWEEN ? AND ? AND county_id = ? AND location_status = 'estimated'
       GROUP BY traffic_source ORDER BY n DESC`,
      params,
    )
    const [seriesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(s.started_at) AS day,
              COUNT(DISTINCT s.visitor_id) AS visitors,
              SUM(s.page_count) AS page_views,
              COUNT(DISTINCT CASE WHEN v.first_seen_at BETWEEN ? AND ? THEN v.id END) AS new_visitors
       FROM accord_nx_ki_sessions s
       JOIN accord_nx_ki_visitors v ON v.id = s.visitor_id
       WHERE s.started_at BETWEEN ? AND ? AND s.county_id = ? AND s.location_status = 'estimated'
       GROUP BY day ORDER BY day ASC`,
      [start, end, start, end, county.id],
    )
    const [hourRows] = await pool.query<RowDataPacket[]>(
      `SELECT HOUR(started_at) AS hour, COUNT(DISTINCT visitor_id) AS visitors
       FROM accord_nx_ki_sessions
       WHERE started_at BETWEEN ? AND ? AND county_id = ? AND location_status = 'estimated'
       GROUP BY hour`,
      params,
    )
    const [pathRows] = await pool.query<RowDataPacket[]>(
      `SELECT a.page_path AS src, b.page_path AS dest, COUNT(*) AS n
       FROM accord_nx_ki_page_views a
       JOIN accord_nx_ki_page_views b
         ON b.session_id = a.session_id AND b.id = (
           SELECT MIN(c.id) FROM accord_nx_ki_page_views c
           WHERE c.session_id = a.session_id AND c.id > a.id
         )
       WHERE a.created_at BETWEEN ? AND ? AND a.county_id = ? AND a.page_path <> b.page_path
       GROUP BY src, dest ORDER BY n DESC LIMIT 8`,
      params,
    )
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0 }))
    for (const row of hourRows) hours[Number(row.hour) || 0].visitors = num(row, 'visitors')
    const productViews = products.reduce((sum, row) => sum + num(row, 'views'), 0)
    const addToCart = products.reduce((sum, row) => sum + num(row, 'carts'), 0)

    return {
      county: { code: county.code, name: county.name },
      period: { start: range.start, end: range.end },
      visitors: { total: visitors, new: neu, returning: Math.max(0, visitors - neu) },
      sessions,
      pageViews: num(totals, 'page_views'),
      averageSessionDuration: sessions ? num(totals, 'duration') / sessions : 0,
      engagementRate: pct(num(totals, 'engaged'), sessions),
      bounceRate: pct(sessions - num(totals, 'engaged'), sessions),
      pagesPerSession: sessions ? num(totals, 'page_views') / sessions : 0,
      productViews,
      addToCartEvents: addToCart,
      devices: { mobile: num(totals, 'mobile'), desktop: num(totals, 'desktop'), tablet: num(totals, 'tablet') },
      locationStatus: 'estimated',
      pages: pages.map((row) => ({ path: String(row.page_path), views: num(row, 'n') })),
      products: products.map((row) => ({
        productId: String(row.product_id),
        name: String(row.name || row.product_id),
        views: num(row, 'views'),
        carts: num(row, 'carts'),
        shares: num(row, 'shares'),
      })),
      searches: searches.map((row) => ({ term: String(row.term), count: num(row, 'n') })),
      categories: categories.map((row) => ({ name: String(row.page_path).replace('/category/', ''), views: num(row, 'n') })),
      features: features.map((row) => ({ event: String(row.event_type), count: num(row, 'n') })),
      paths: pathRows.map((row) => ({ from: String(row.src), to: String(row.dest), count: num(row, 'n') })),
      trafficSources: sources.map((row) => ({ source: String(row.source || 'unknown'), sessions: num(row, 'n') })),
      series: seriesRows.map((row) => ({
        date: String(row.day).slice(0, 10),
        visitors: num(row, 'visitors'),
        pageViews: num(row, 'page_views'),
        newVisitors: num(row, 'new_visitors'),
        returningVisitors: Math.max(0, num(row, 'visitors') - num(row, 'new_visitors')),
      })),
      hourly: hours,
    }
  })
}

export async function kenyaCountyCompare(codes: string[], range: AnalyticsRange) {
  const selected = codes.map((code) => countyByCode(code)).filter(Boolean).slice(0, 5)
  const details = []
  for (const county of selected) {
    if (!county) continue
    const detail = await kenyaCountyDetail(county.code, range)
    if (detail) details.push(detail)
  }
  return details
}

export function kenyaOverviewCsv(overview: AnalyticsOverview) {
  const rows = [
    ['County code', 'County', 'Visitors', 'Sessions', 'Page views', 'New visitors', 'Returning visitors', 'Product views', 'Add to cart', 'Avg session seconds', 'Engagement rate'],
    ...overview.counties.map((county) => [
      county.code,
      county.name,
      county.visitors,
      county.sessions,
      county.pageViews,
      county.newVisitors,
      county.returningVisitors,
      county.productViews,
      county.addToCart,
      Math.round(county.avgSessionSeconds),
      county.engagementRate,
    ]),
  ]
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}
