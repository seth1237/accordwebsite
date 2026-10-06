import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { ADMIN_COOKIE, adminCookieOptions, authenticateAdmin, createAdminSessionValue, parseAdminSessionValue } from '../../lib/auth-core'
import { slugifyName } from '../../lib/catalog'
import { createCatalogCategory, createCatalogProduct, getCatalog, getCatalogProduct, getPriceVisibility } from '../../lib/catalog-data'
import { csvIds } from '../../lib/content'
import { isOfferLive, parseOfferProductPrices } from '../../lib/offers'
import { parseSeo } from '../../lib/seo-fields'
import { excerptFromBody, parseEventBody } from '../../lib/event-body'
import { prepareStoredImage } from '../../lib/image-convert'
import {
  catalogueAnalytics,
  createCatalogue,
  createCompanyProfilePage,
  createEvent,
  createInstallation,
  createManufacturer,
  createOffer,
  createRedirect,
  deleteCatalogue,
  deleteCompanyProfilePage,
  deleteEvent,
  deleteInstallation,
  deleteOffer,
  deleteRedirect,
  getCatalogueById,
  getCompanyProfilePageById,
  getEventById,
  getEventBySlug,
  getEventEngagement,
  getOfferEventStats,
  listOfferEvents,
  recordOfferEvent,
  addEventComment,
  toggleEventLike,
  getInstallationById,
  getInstallationBySlug,
  getManufacturerByToken,
  getOfferById,
  getOfferBySlug,
  getRedirectById,
  listCatalogues,
  listCompanyProfilePages,
  listEvents,
  listInstallations,
  listManufacturers,
  listOffers,
  listRedirects,
  recordCatalogueDownload,
  replaceCompanyProfileFromPdf,
  resolveRedirect,
  updateCompanyProfilePage,
  updateEvent,
  updateInstallation,
  updateManufacturer,
  updateOffer,
  updateRedirect,
} from '../../lib/content-data'
import {
  addProductImage,
  createContactMessage,
  createJob,
  deleteJob,
  getCategoryPerformance,
  getJobById,
  getJobBySlug,
  getSiteSettings,
  getVisitorReport,
  getVisitorStats,
  listJobs,
  recordProductClick,
  recordProductShare,
  recordSiteVisit,
  removeProductImage,
  setProductImageInstallation,
  updateJob,
  updateProductDetails,
  updateSiteSettings,
} from '../../lib/mongodb'
import { emptyVisitorReport, parsePeriod } from '../../lib/visitor-report'
import {
  isMysqlConfigured,
  isMysqlConnectError,
  isStoreConfigured,
  mysqlAddProductImage,
  mysqlDeleteFile,
  mysqlGetCatalogueFile,
  mysqlGetFile,
} from '../../lib/mysql'
import { catalogImportStatus, importCatalogBatch } from '../../lib/catalog-import'
import { deleteCloudinaryImage, isCloudinaryConfigured, uploadProductImage } from '../../lib/cloudinary'
import { createERPQuote } from '../../lib/erp'
import { COMPANY } from '../../lib/utils'
import { formChecked, formText, uploadFormDocument, uploadFormImage } from './forms'

const CORS_ORIGINS = new Set([
  'https://accordmedical.co.ke',
  'https://www.accordmedical.co.ke',
  'https://accordwebsite.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

function allowedCorsOrigin(origin: string) {
  if (!origin) return origin
  const normalized = origin.replace(/\/$/, '')
  if (CORS_ORIGINS.has(normalized)) return origin
  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  } catch {}
  return ''
}

const app = new Hono()

app.use('*', bodyLimit({ maxSize: 50 * 1024 * 1024 }))
app.use('*', cors({
  origin: (origin) => allowedCorsOrigin(origin || ''),
  credentials: true,
  allowHeaders: ['Content-Type', 'Cookie', 'x-import-key'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.onError((error, c) => {
  if (isMysqlConnectError(error)) {
    return c.json({ success: false, message: error.message }, 503)
  }
  console.error(error)
  return c.json({ success: false, message: error instanceof Error ? error.message : 'Server error' }, 500)
})

function json(c: { json: (data: unknown, status?: number) => Response }, data: unknown, status = 200) {
  return c.json(data, status)
}

function sessionFrom(c: { req: { header: (name: string) => string | undefined } }) {
  const header = c.req.header('cookie') || ''
  const match = header.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`))
  return parseAdminSessionValue(match?.[1] || getCookie(c as never, ADMIN_COOKIE))
}

function requireAdmin(c: Parameters<typeof sessionFrom>[0]) {
  const session = sessionFrom(c)
  if (!session) return { error: { success: false, message: 'Sign in required' }, status: 401 as const }
  if (!isStoreConfigured()) return { error: { success: false, message: 'Database is not configured' }, status: 503 as const }
  return { session }
}

function textValue(value: unknown, max = 200) {
  return String(value || '').trim().slice(0, max)
}

function databaseErrorMessage(error: unknown) {
  const code = (error as { code?: string }).code || ''
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    const host = process.env.MYSQL_HOST || 'MYSQL_HOST'
    const port = process.env.MYSQL_PORT || '3306'
    return `Cannot reach MySQL at ${host}:${port} (${code}). Allow this computer in cPanel Remote MySQL, then try again.`
  }
  return error instanceof Error && error.message ? error.message : 'Database request failed'
}

app.get('/health', (c) => c.json({ ok: true, service: 'accord-backend' }))

const BOOTSTRAP_TTL_MS = 15_000
let bootstrapMemo: { at: number; payload: Record<string, unknown> } | null = null
let bootstrapInflight: Promise<Record<string, unknown>> | null = null

function invalidatePublicCatalog() {
  bootstrapMemo = null
  bootstrapInflight = null
}

async function loadBootstrap() {
  const catalog = await getCatalog().catch(() => ({ products: [], categories: [] }))
  const [showPrices, jobs, offers] = await Promise.all([
    getPriceVisibility().catch(() => true),
    listJobs(true).catch(() => []),
    listOffers(true).catch(() => []),
  ])
  return {
    success: true,
    catalog,
    showPrices: showPrices !== false,
    jobCount: jobs.length,
    offer: offers[0] || null,
    headerOffers: offers.filter((offer) => offer.showHeader),
  }
}

app.get('/api/site/bootstrap', async (c) => {
  if (bootstrapMemo && Date.now() - bootstrapMemo.at < BOOTSTRAP_TTL_MS) {
    return c.json(bootstrapMemo.payload)
  }
  if (!bootstrapInflight) {
    bootstrapInflight = loadBootstrap()
      .then((payload) => {
        const catalog = payload.catalog as { products?: unknown[] } | undefined
        if (catalog?.products?.length) bootstrapMemo = { at: Date.now(), payload }
        return payload
      })
      .finally(() => {
        bootstrapInflight = null
      })
  }
  return c.json(await bootstrapInflight)
})

app.get('/api/catalog', async (c) => {
  const slug = c.req.query('category') || c.req.query('categoryIds')
  const categoryIds = slug?.split(',').filter(Boolean)
  const catalog = await getCatalog(categoryIds)
  return c.json({ success: true, catalog })
})

app.get('/api/products', async (c) => {
  const slug = c.req.query('category') || c.req.query('categoryIds')
  const categoryIds = slug?.split(',').filter(Boolean)
  try {
    const catalog = await getCatalog(categoryIds)
    return c.json({ success: true, status: 'success', total: catalog.products.length, data: catalog.products })
  } catch (error) {
    return c.json({ success: false, status: 'error', message: error instanceof Error ? error.message : 'Product fetch failed' }, 502)
  }
})

app.get('/api/products/:slug', async (c) => {
  try {
    const product = await getCatalogProduct(c.req.param('slug'))
    if (!product) return c.json({ success: false, status: 'error', message: 'Product not found' }, 404)
    return c.json({ success: true, status: 'success', data: product })
  } catch (error) {
    return c.json({ success: false, status: 'error', message: error instanceof Error ? error.message : 'Product fetch failed' }, 502)
  }
})

app.get('/api/categories', async (c) => {
  const catalog = await getCatalog()
  const data = catalog.categories.map((category) => ({ name: category.name, slug: category.slug, count: category.count }))
  return c.json({ success: true, status: 'success', total: data.length, data })
})

app.get('/api/categories/:slug', async (c) => {
  const slug = c.req.param('slug')
  const catalog = await getCatalog()
  const category = catalog.categories.find((item) => item.slug === slug)
  const products = catalog.products.filter((product) => product.categoryId === slug)
  if (!category && !products.length) return c.json({ success: false, status: 'error', message: 'Category not found' }, 404)
  return c.json({
    success: true,
    status: 'success',
    name: category?.name || products[0]?.categoryName || slug,
    slug,
    count: products.length,
    data: products,
  })
})

app.get('/api/jobs', async (c) => c.json({ success: true, data: await listJobs(true).catch(() => []) }))
app.get('/api/jobs/:slug', async (c) => {
  const job = await getJobBySlug(c.req.param('slug'))
  if (!job) return c.json({ success: false, message: 'Job not found' }, 404)
  return c.json({ success: true, data: job })
})
app.get('/api/offers', async (c) => c.json({ success: true, data: await listOffers(true).catch(() => []) }))
app.get('/api/offers/:slug', async (c) => {
  const item = await getOfferBySlug(c.req.param('slug')).catch(() => null)
  if (!item || !isOfferLive(item)) return c.json({ success: false, message: 'Offer not found' }, 404)
  return c.json({ success: true, data: item })
})
app.get('/api/events', async (c) => c.json({ success: true, data: await listEvents(true).catch(() => []) }))
app.get('/api/events/:slug', async (c) => {
  const item = await getEventBySlug(c.req.param('slug'))
  if (!item || !item.published) return c.json({ success: false, message: 'Event not found' }, 404)
  return c.json({ success: true, data: item })
})
app.get('/api/events/:slug/engagement', async (c) => {
  try {
    const data = await getEventEngagement(c.req.param('slug'), textValue(c.req.query('visitorId'), 64))
    if (!data) return c.json({ success: false, message: 'Event not found' }, 404)
    return c.json({ success: true, data })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: true, data: { likes: 0, liked: false, comments: [] } })
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not load comments' }, 500)
  }
})
app.post('/api/events/:slug/like', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const data = await toggleEventLike(c.req.param('slug'), textValue(body.visitorId, 64))
    if (!data) return c.json({ success: false, message: 'Event not found' }, 404)
    return c.json({ success: true, data })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: false, message: 'Likes are unavailable right now' }, 503)
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not save like' }, 500)
  }
})
app.post('/api/events/:slug/comments', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const data = await addEventComment({
      slug: c.req.param('slug'),
      visitorId: textValue(body.visitorId, 64),
      name: textValue(body.name, 80),
      body: textValue(body.body || body.comment, 1000),
      honeypot: textValue(body.website, 120),
    })
    if (!data) return c.json({ success: false, message: 'Event not found' }, 404)
    return c.json({ success: true, data })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: false, message: 'Comments are unavailable right now' }, 503)
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not post comment' }, 400)
  }
})
app.get('/api/installations', async (c) => c.json({ success: true, data: await listInstallations(true).catch(() => []) }))
app.get('/api/installations/:slug', async (c) => {
  const item = await getInstallationBySlug(c.req.param('slug'))
  if (!item) return c.json({ success: false, message: 'Project not found' }, 404)
  return c.json({ success: true, data: item })
})
app.get('/api/company-profile', async (c) => c.json({ success: true, data: await listCompanyProfilePages(true).catch(() => []) }))
app.get('/api/catalogues', async (c) => c.json({ success: true, data: await listCatalogues().catch(() => []) }))
app.get('/api/settings/prices', async (c) => c.json({ success: true, showPrices: await getPriceVisibility() }))

app.get('/api/redirects/lookup', async (c) => {
  const from = c.req.query('from') || ''
  if (!from || from === '/' || from === '/json' || from.startsWith('/json/')) {
    return c.json({ success: false }, 404)
  }
  const match = await resolveRedirect(from).catch(() => null)
  if (!match) return c.json({ success: false }, 404)
  return c.json({ success: true, to: match.to, status: match.status })
})

app.get('/api/media/file/:id', async (c) => {
  try {
    const file = await mysqlGetFile(c.req.param('id'))
    if (!file) return c.json({ success: false, message: 'File not found' }, 404)
    return new Response(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.mime || 'application/octet-stream',
        'Content-Length': String(file.data.length),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.body(null, 503)
    throw error
  }
})

app.get('/api/catalogues/:id/download', async (c) => {
  const id = c.req.param('id')
  const existing = await getCatalogueById(id)
  if (!existing) return c.json({ success: false, message: 'Catalogue not found' }, 404)
  await recordCatalogueDownload({
    catalogueId: id,
    productId: c.req.query('productId') || existing.erpProductId,
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || '',
    referrer: c.req.header('referer') || '',
  }).catch(() => null)
  const filename = `${slugifyName(existing.productName || existing.title) || 'catalogue'}.pdf`
  if (isMysqlConfigured()) {
    const file = await mysqlGetCatalogueFile(id)
    if (!file) return c.json({ success: false, message: 'Catalogue file is unavailable' }, 404)
    return new Response(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.mime || 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }
  const remote = await fetch(existing.file.secureUrl)
  if (!remote.ok || !remote.body) return c.json({ success: false, message: 'Catalogue file is unavailable' }, 502)
  return new Response(remote.body, {
    headers: {
      'Content-Type': remote.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
})

app.post('/api/products/click', async (c) => {
  try {
    const body = await c.req.json()
    const erpProductId = textValue(body.productId || body.erpProductId, 80)
    if (!erpProductId) return c.json({ success: false, message: 'productId is required' }, 400)
    await recordProductClick({
      erpProductId,
      productName: textValue(body.productName, 200),
      categoryId: textValue(body.categoryId, 80),
      categoryName: textValue(body.categoryName, 200),
      fromProductId: textValue(body.fromProductId, 80) || undefined,
    })
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not record click' }, 500)
  }
})

app.post('/api/offers/event', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const eventType = textValue(body.type || body.eventType, 20)
    if (eventType !== 'click' && eventType !== 'whatsapp') {
      return c.json({ success: false, message: 'type must be click or whatsapp' }, 400)
    }
    const productId = textValue(body.productId, 80)
    if (!productId) return c.json({ success: false, message: 'productId is required' }, 400)
    await recordOfferEvent({
      offerId: textValue(body.offerId, 64),
      productId,
      productName: textValue(body.productName, 200),
      eventType,
      path: textValue(body.path, 255),
      visitorId: textValue(body.visitorId, 64),
    })
    return c.json({ success: true })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: true })
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not record offer event' }, 500)
  }
})

app.post('/api/products/share', async (c) => {
  try {
    const body = await c.req.json()
    const erpProductId = textValue(body.productId || body.erpProductId, 80)
    if (!erpProductId) return c.json({ success: false, message: 'productId is required' }, 400)
    await recordProductShare({
      erpProductId,
      productName: textValue(body.productName, 200),
      categoryId: textValue(body.categoryId, 80),
      categoryName: textValue(body.categoryName, 200),
    })
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not record share' }, 500)
  }
})

app.post('/api/analytics/visit', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    await recordSiteVisit({
      visitorId: textValue(body.visitorId, 64),
      path: textValue(body.path, 255),
    })
    return c.json({ success: true })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: true })
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not record visit' }, 500)
  }
})

app.post('/api/contact', async (c) => {
  if (!isStoreConfigured()) return c.json({ success: false, message: 'Contact inbox is not configured' }, 503)
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email(),
      phone: z.string().trim().min(7).max(40),
      location: z.string().trim().max(160).optional(),
      message: z.string().trim().min(10).max(2000),
    })
    const body = schema.parse(await c.req.json())
    await createContactMessage({
      name: body.name,
      email: body.email,
      phone: body.phone,
      location: body.location || '',
      message: body.message,
    })
    return c.json({ success: true })
  } catch {
    return c.json({ success: false, message: 'Please check the form and try again' }, 400)
  }
})

app.post('/api/quote-requests', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.clientName || !body.clientNumber || !body.clientLocation || !Array.isArray(body.items) || !body.items.length) {
      return c.json({ success: false, message: 'clientName, clientNumber, clientLocation and items are required' }, 400)
    }
    return c.json(await createERPQuote(body))
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Quote request failed' }, 502)
  }
})

app.post('/api/auth/login', async (c) => {
  try {
    const schema = z.object({
      email: z.string().trim().min(1).max(191),
      password: z.string().min(1),
    })
    const body = schema.parse(await c.req.json())
    const admin = await authenticateAdmin(body.email, body.password)
    if (!admin) return c.json({ success: false, message: 'Invalid username or password' }, 401)
    setCookie(c, ADMIN_COOKIE, createAdminSessionValue(admin.email), adminCookieOptions())
    return c.json({ success: true, email: admin.email, name: admin.name })
  } catch {
    return c.json({ success: false, message: 'Could not sign in' }, 500)
  }
})

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, ADMIN_COOKIE, { path: '/' })
  return c.json({ success: true })
})

app.get('/api/auth/me', (c) => {
  const session = sessionFrom(c)
  if (!session) return c.json({ success: false }, 401)
  return c.json({ success: true, email: session.email })
})

app.post('/api/manufacturers/apply', async (c) => {
  if (!isStoreConfigured()) return c.json({ success: false, message: 'Applications are not available right now' }, 503)
  const form = await c.req.formData()
  const companyName = formText(form, 'companyName')
  const email = formText(form, 'email')
  const contactName = formText(form, 'contactName')
  if (!companyName || !email || !contactName) return c.json({ success: false, message: 'Company name, contact name, and email are required' }, 400)
  try {
    const brochure = await uploadFormDocument(form.get('brochure'), 'tarumed/manufacturers', slugifyName(companyName) || 'maker').catch(() => null)
    const item = await createManufacturer({
      companyName,
      contactName,
      email,
      phone: formText(form, 'phone'),
      website: formText(form, 'website'),
      productsOfInterest: formText(form, 'productsOfInterest'),
      notes: formText(form, 'notes'),
      brochure,
    })
    return c.json({ success: true, data: { token: item.token, status: item.status } })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not submit application' }, 500)
  }
})

app.get('/api/manufacturers/status', async (c) => {
  const item = await getManufacturerByToken(c.req.query('token') || '')
  if (!item) return c.json({ success: false, message: 'Application not found' }, 404)
  return c.json({
    success: true,
    data: {
      companyName: item.companyName,
      status: item.status,
      adminNote: item.adminNote,
      createdAt: item.createdAt,
    },
  })
})

async function authorizeImport(c: { req: { header: (name: string) => string | undefined } } & Parameters<typeof sessionFrom>[0]) {
  if (sessionFrom(c)) return true
  const key = c.req.header('x-import-key') || ''
  const expected = process.env.CATALOG_IMPORT_KEY || process.env.ADMIN_SESSION_SECRET || ''
  return Boolean(expected) && key === expected
}

app.get('/api/admin/catalog-import', async (c) => {
  if (!(await authorizeImport(c))) return c.json({ success: false, message: 'Sign in required' }, 401)
  if (!isMysqlConfigured()) return c.json({ success: false, message: 'MySQL is not configured' }, 503)
  try {
    return c.json({ success: true, data: await catalogImportStatus() })
  } catch (error) {
    return c.json({ success: false, message: databaseErrorMessage(error) }, 503)
  }
})

app.post('/api/admin/catalog-import', async (c) => {
  if (!(await authorizeImport(c))) return c.json({ success: false, message: 'Sign in required' }, 401)
  if (!isMysqlConfigured()) return c.json({ success: false, message: 'MySQL is not configured' }, 503)
  const body = await c.req.json().catch(() => ({})) as { limit?: number }
  const limit = Math.max(1, Math.min(20, Number(body.limit) || 6))
  try {
    return c.json({ success: true, data: await importCatalogBatch(limit) })
  } catch (error) {
    return c.json({ success: false, message: databaseErrorMessage(error) }, 503)
  }
})

app.post('/api/admin/categories', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  if (!isMysqlConfigured()) return c.json({ success: false, message: 'MySQL is not configured' }, 503)
  const form = await c.req.formData()
  const name = formText(form, 'name')
  if (!name) return c.json({ success: false, message: 'Category name is required' }, 400)
  try {
    const data = await createCatalogCategory({ name, description: formText(form, 'description') })
    invalidatePublicCatalog()
    return c.json({ success: true, data })
  } catch (error) {
    return c.json({ success: false, message: databaseErrorMessage(error) }, 400)
  }
})

app.post('/api/admin/products', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  if (!isMysqlConfigured()) return c.json({ success: false, message: 'MySQL is not configured' }, 503)
  const form = await c.req.formData()
  const name = formText(form, 'name')
  if (!name) return c.json({ success: false, message: 'Product name is required' }, 400)
  try {
    const product = await createCatalogProduct({
      name,
      description: formText(form, 'description'),
      details: formText(form, 'details'),
      categoryId: formText(form, 'categoryId'),
      categoryName: formText(form, 'categoryName'),
      manufacturer: formText(form, 'manufacturer'),
      price: Number(formText(form, 'price')) || 0,
      inStock: form.get('inStock') === 'true',
      featured: form.get('featured') === 'true',
      seo: parseSeo({
        focusKeyword: formText(form, 'focusKeyword'),
        seoTitle: formText(form, 'seoTitle'),
        seoDescription: formText(form, 'seoDescription'),
        seoSlug: formText(form, 'seoSlug'),
        seoKeywords: formText(form, 'seoKeywords'),
        imageAlt: formText(form, 'imageAlt'),
      }),
      slug: formText(form, 'seoSlug'),
    })
    const files = form.getAll('file').filter((item): item is File => item instanceof File)
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const prepared = await prepareStoredImage(buffer, file.name || 'product.jpg', file.type)
      await mysqlAddProductImage(product.id, prepared.buffer, prepared.filename, prepared.mime)
    }
    invalidatePublicCatalog()
    return c.json({ success: true, data: product })
  } catch (error) {
    return c.json({ success: false, message: databaseErrorMessage(error) }, 400)
  }
})

app.get('/api/admin/jobs', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listJobs(false) })
})

app.post('/api/admin/jobs', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  const description = formText(form, 'description')
  if (!title || !description) return c.json({ success: false, message: 'Title and details are required' }, 400)
  let image: { publicId: string; secureUrl: string } | null = null
  const file = form.get('image')
  if (file instanceof File && file.size > 0) {
    image = await uploadFormImage(file, 'tarumed/jobs', slugifyName(title) || 'job')
  }
  const job = await createJob({
    title,
    slug: slugifyName(title) || 'role',
    location: formText(form, 'location') || 'Nairobi',
    employmentType: formText(form, 'employmentType') || 'Full time',
    department: formText(form, 'department'),
    summary: formText(form, 'summary') || description.slice(0, 160),
    description,
    requirements: formText(form, 'requirements'),
    applyEmail: formText(form, 'applyEmail') || COMPANY.careersEmail,
    image,
    published: formText(form, 'published') !== 'false',
  })
  return c.json({ success: true, data: job })
})

app.patch('/api/admin/jobs/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const id = c.req.param('id')
  const existing = await getJobById(id)
  if (!existing) return c.json({ success: false, message: 'Job not found' }, 404)
  const form = await c.req.formData()
  const title = formText(form, 'title') || existing.title
  let image = existing.image
  const file = form.get('image')
  if (file instanceof File && file.size > 0) {
    image = await uploadFormImage(file, 'tarumed/jobs', slugifyName(title) || 'job')
    if (existing.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
  }
  if (formText(form, 'removeImage') === 'true') {
    if (existing.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
    image = null
  }
  const job = await updateJob(id, {
    title,
    slug: slugifyName(title) || existing.slug,
    location: formText(form, 'location') || existing.location,
    employmentType: formText(form, 'employmentType') || existing.employmentType,
    department: formText(form, 'department'),
    summary: formText(form, 'summary') || existing.summary,
    description: formText(form, 'description') || existing.description,
    requirements: formText(form, 'requirements'),
    applyEmail: formText(form, 'applyEmail') || COMPANY.careersEmail,
    image,
    published: formText(form, 'published') !== 'false',
  })
  return c.json({ success: true, data: job })
})

app.delete('/api/admin/jobs/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteJob(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Job not found' }, 404)
  if (removed.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(removed.image.publicId).catch(() => undefined)
  return c.json({ success: true })
})

app.get('/api/admin/settings', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const settings = await getSiteSettings()
  return c.json({ success: true, showPrices: settings.showPrices })
})

app.post('/api/admin/settings', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const body = z.object({ showPrices: z.boolean() }).parse(await c.req.json())
  const settings = await updateSiteSettings({ showPrices: body.showPrices })
  return c.json({ success: true, showPrices: settings.showPrices })
})

app.post('/api/admin/product-details', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const body = z.object({
    erpProductId: z.string().min(1),
    details: z.string().max(8000),
    distributedFor: z.string().max(200).optional(),
  }).parse(await c.req.json())
  const data = await updateProductDetails(body.erpProductId, body.details.trim(), { distributedFor: body.distributedFor?.trim() || '' })
  return c.json({ success: true, data })
})

app.post('/api/admin/product-image', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const erpProductId = String(form.get('erpProductId') || '').trim()
  const installation = String(form.get('installation') || '') === 'true'
  const files = form.getAll('file').filter((item): item is File => item instanceof File)
  if (!erpProductId || !files.length) return c.json({ success: false, message: 'erpProductId and image files are required' }, 400)
  const uploaded = []
  for (const file of files) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) continue
    const buffer = Buffer.from(await file.arrayBuffer())
    const prepared = await prepareStoredImage(buffer, file.name || 'product.jpg', file.type)
    if (isMysqlConfigured()) {
      uploaded.push(await mysqlAddProductImage(erpProductId, prepared.buffer, prepared.filename, prepared.mime, installation))
      continue
    }
    const result = await uploadProductImage(prepared.buffer, erpProductId)
    uploaded.push(await addProductImage(erpProductId, { publicId: result.public_id, secureUrl: result.secure_url, installation }))
  }
  if (!uploaded.length) return c.json({ success: false, message: 'No valid images uploaded' }, 400)
  return c.json({ success: true, data: uploaded.at(-1) })
})

app.patch('/api/admin/product-image', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const body = z.object({ erpProductId: z.string().min(1), publicId: z.string().min(1), installation: z.boolean() }).parse(await c.req.json())
  await setProductImageInstallation(body.erpProductId, body.publicId, body.installation)
  return c.json({ success: true })
})

app.delete('/api/admin/product-image', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const body = z.object({ erpProductId: z.string().min(1), publicId: z.string().min(1) }).parse(await c.req.json())
  const existing = await removeProductImage(body.erpProductId, body.publicId)
  if (existing?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.publicId).catch(() => undefined)
  else if (existing?.publicId && isCloudinaryConfigured()) await deleteCloudinaryImage(existing.publicId).catch(() => undefined)
  return c.json({ success: true })
})

app.get('/api/admin/redirects', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listRedirects() })
})

app.post('/api/admin/redirects', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const from = formText(form, 'from')
  const to = formText(form, 'to')
  if (!from || !to) return c.json({ success: false, message: 'From and to paths are required' }, 400)
  const item = await createRedirect({ from, to, status: Number(formText(form, 'status') || 301) })
  return c.json({ success: true, data: item })
})

app.patch('/api/admin/redirects/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getRedirectById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Redirect not found' }, 404)
  const form = await c.req.formData()
  const item = await updateRedirect(c.req.param('id'), {
    from: formText(form, 'from') || existing.from,
    to: formText(form, 'to') || existing.to,
    status: Number(formText(form, 'status') || existing.status),
  })
  return c.json({ success: true, data: item })
})

app.delete('/api/admin/redirects/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteRedirect(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Redirect not found' }, 404)
  return c.json({ success: true })
})

app.get('/api/admin/catalogues', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await catalogueAnalytics() })
})

app.post('/api/admin/catalogues', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  const erpProductId = formText(form, 'erpProductId')
  if (!title || !erpProductId) return c.json({ success: false, message: 'Title and product ID are required' }, 400)
  const catalog = await getCatalog()
  const product = catalog.products.find((item) => item.id === erpProductId)
  const upload = form.get('file')
  if (!(upload instanceof File) || upload.size <= 0) return c.json({ success: false, message: 'Upload a PDF catalogue' }, 400)
  const item = isMysqlConfigured()
    ? await createCatalogue({
        title,
        erpProductId,
        categoryId: product?.categoryId || '',
        productName: product?.name || '',
        file: { publicId: '', secureUrl: '' },
        fileBytes: Buffer.from(await upload.arrayBuffer()),
        filename: upload.name || 'catalogue.pdf',
        mime: upload.type || 'application/pdf',
      })
    : await createCatalogue({
        title,
        erpProductId,
        categoryId: product?.categoryId || '',
        productName: product?.name || '',
        file: await uploadFormDocument(upload, 'tarumed/catalogues', slugifyName(title) || 'catalogue').then((file) => {
          if (!file) throw new Error('Upload a PDF catalogue')
          return file
        }),
      })
  return c.json({ success: true, data: item, catalogues: await listCatalogues() })
})

app.delete('/api/admin/catalogues/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteCatalogue(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Catalogue not found' }, 404)
  if (removed.file?.publicId) await deleteCloudinaryImage(removed.file.publicId, 'raw').catch(() => undefined)
  return c.json({ success: true })
})

app.get('/api/admin/manufacturers', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listManufacturers() })
})

app.patch('/api/admin/manufacturers', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const id = formText(form, 'id')
  const status = formText(form, 'status')
  if (!id || !['approved', 'rejected', 'pending'].includes(status)) return c.json({ success: false, message: 'Valid id and status are required' }, 400)
  const item = await updateManufacturer(id, { status: status as 'approved' | 'rejected' | 'pending', adminNote: formText(form, 'adminNote') })
  if (!item) return c.json({ success: false, message: 'Submission not found' }, 404)
  return c.json({ success: true, data: item })
})

app.get('/api/admin/performance', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  try {
    return c.json({ success: true, data: await getCategoryPerformance() })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: true, data: [] })
    throw error
  }
})

app.get('/api/admin/visitors', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const period = c.req.query('period')
  const from = c.req.query('from')
  const to = c.req.query('to')
  try {
    if (period || from || to) {
      return c.json({ success: true, data: await getVisitorReport({ period, from, to }) })
    }
    return c.json({ success: true, data: await getVisitorStats(90) })
  } catch (error) {
    if (isMysqlConnectError(error)) {
      if (period || from || to) {
        return c.json({ success: true, data: emptyVisitorReport(parsePeriod(period)) })
      }
        return c.json({ success: true, data: { today: { date: '', visitors: 0, pageviews: 0, newVisitors: 0 }, days: [] } })
    }
    throw error
  }
})

app.get('/api/admin/offers', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listOffers(false) })
})

app.post('/api/admin/offers', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  if (!title) return c.json({ success: false, message: 'Title is required' }, 400)
  const banner = await uploadFormImage(form.get('banner'), 'tarumed/offers', slugifyName(title) || 'offer')
  const item = await createOffer({
    title,
    description: formText(form, 'description'),
    discountText: formText(form, 'discountText'),
    kind: formText(form, 'kind') === 'custom' ? 'custom' : 'products',
    productIds: csvIds(formText(form, 'productIds')),
    productPrices: parseOfferProductPrices(formText(form, 'productPrices')),
    price: Number(formText(form, 'price')) || 0,
    compareAt: Number(formText(form, 'compareAt')) || 0,
    showPrice: formChecked(form, 'showPrice'),
    customProductId: '',
    startDate: formText(form, 'startDate') || new Date().toISOString(),
    endDate: formText(form, 'endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    banner,
    showHeader: formChecked(form, 'showHeader'),
    headerTagline: formText(form, 'headerTagline'),
    headerCta: formText(form, 'headerCta'),
    slug: formText(form, 'seoSlug'),
    seo: parseSeo({
      focusKeyword: formText(form, 'focusKeyword'),
      seoTitle: formText(form, 'seoTitle'),
      seoDescription: formText(form, 'seoDescription'),
      seoSlug: formText(form, 'seoSlug'),
      seoKeywords: formText(form, 'seoKeywords'),
      imageAlt: formText(form, 'imageAlt'),
    }),
    published: formChecked(form, 'published'),
  })
  invalidatePublicCatalog()
  return c.json({ success: true, data: item })
})

app.patch('/api/admin/offers/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getOfferById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Offer not found' }, 404)
  const form = await c.req.formData()
  const title = formText(form, 'title') || existing.title
  let banner = existing.banner
  const uploaded = await uploadFormImage(form.get('banner'), 'tarumed/offers', slugifyName(title) || 'offer')
  if (uploaded) banner = uploaded
  if (formText(form, 'removeImage') === 'true') banner = null
  const item = await updateOffer(c.req.param('id'), {
    title,
    description: formText(form, 'description'),
    discountText: formText(form, 'discountText'),
    kind: formText(form, 'kind') === 'custom' ? 'custom' : existing.kind || 'products',
    productIds: csvIds(formText(form, 'productIds')),
    productPrices: parseOfferProductPrices(formText(form, 'productPrices')),
    price: Number(formText(form, 'price') || existing.price) || 0,
    compareAt: Number(formText(form, 'compareAt') || existing.compareAt) || 0,
    showPrice: form.has('showPrice') ? formChecked(form, 'showPrice') : existing.showPrice,
    startDate: formText(form, 'startDate') || existing.startDate,
    endDate: formText(form, 'endDate') || existing.endDate,
    banner,
    showHeader: form.has('showHeader') ? formChecked(form, 'showHeader') : existing.showHeader,
    headerTagline: form.has('headerTagline') ? formText(form, 'headerTagline') : existing.headerTagline,
    headerCta: form.has('headerCta') ? formText(form, 'headerCta') : existing.headerCta,
    seo: parseSeo({
      focusKeyword: formText(form, 'focusKeyword'),
      seoTitle: formText(form, 'seoTitle'),
      seoDescription: formText(form, 'seoDescription'),
      seoSlug: formText(form, 'seoSlug'),
      seoKeywords: formText(form, 'seoKeywords'),
      imageAlt: formText(form, 'imageAlt'),
    }),
    published: formChecked(form, 'published'),
  })
  invalidatePublicCatalog()
  return c.json({ success: true, data: item })
})

app.delete('/api/admin/offers/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteOffer(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Offer not found' }, 404)
  invalidatePublicCatalog()
  return c.json({ success: true })
})

app.get('/api/admin/offers/stats', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  try {
    const [stats, events] = await Promise.all([getOfferEventStats(), listOfferEvents(80)])
    return c.json({ success: true, data: { ...stats, events } })
  } catch (error) {
    if (isMysqlConnectError(error)) return c.json({ success: true, data: { clicks: 0, whatsapp: 0, products: [], events: [] } })
    return c.json({ success: false, message: databaseErrorMessage(error) }, 503)
  }
})

app.post('/api/admin/media', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  try {
    const form = await c.req.formData()
    const uploaded = await uploadFormImage(form.get('file'), formText(form, 'folder') || 'tarumed/events', slugifyName(formText(form, 'name')) || 'image')
    if (!uploaded) return c.json({ success: false, message: 'Upload a valid image under 8MB' }, 400)
    return c.json({ success: true, data: uploaded })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Could not upload image' }, 400)
  }
})

app.get('/api/admin/events', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listEvents(false) })
})

app.post('/api/admin/events', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  if (!title) return c.json({ success: false, message: 'Title is required' }, 400)
  const cover = await uploadFormImage(form.get('cover'), 'tarumed/events', slugifyName(title) || 'event')
  const body = parseEventBody(formText(form, 'body'), formText(form, 'description'))
  const item = await createEvent({
    title,
    slug: formText(form, 'slug'),
    description: formText(form, 'description') || excerptFromBody(body),
    startAt: formText(form, 'startAt') || new Date().toISOString(),
    location: formText(form, 'location'),
    cover,
    registrationUrl: formText(form, 'registrationUrl'),
    body,
    published: formChecked(form, 'published'),
  })
  return c.json({ success: true, data: item })
})

app.patch('/api/admin/events/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getEventById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Event not found' }, 404)
  const form = await c.req.formData()
  const title = form.has('title') ? formText(form, 'title') || existing.title : existing.title
  let cover = existing.cover
  const uploaded = await uploadFormImage(form.get('cover'), 'tarumed/events', slugifyName(title) || 'event')
  if (uploaded) cover = uploaded
  if (formText(form, 'removeImage') === 'true') cover = null
  const body = form.has('body')
    ? parseEventBody(form.get('body'), formText(form, 'description') || existing.description)
    : existing.body
  const item = await updateEvent(c.req.param('id'), {
    title,
    slug: form.has('slug') ? formText(form, 'slug') || existing.slug : existing.slug,
    description: form.has('description') ? formText(form, 'description') || excerptFromBody(body) : existing.description,
    startAt: form.has('startAt') ? formText(form, 'startAt') || existing.startAt : existing.startAt,
    location: form.has('location') ? formText(form, 'location') : existing.location,
    cover,
    registrationUrl: form.has('registrationUrl') ? formText(form, 'registrationUrl') : existing.registrationUrl,
    body,
    published: form.has('published') ? formChecked(form, 'published') : existing.published,
  })
  return c.json({ success: true, data: item })
})

app.post('/api/admin/events/:id/duplicate', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getEventById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Event not found' }, 404)
  const item = await createEvent({
    title: `${existing.title.replace(/\s+\(copy\)\s*$/i, '')} (copy)`,
    slug: '',
    description: existing.description,
    startAt: existing.startAt,
    location: existing.location,
    cover: existing.cover,
    registrationUrl: existing.registrationUrl,
    body: existing.body,
    published: false,
  })
  return c.json({ success: true, data: item })
})

app.delete('/api/admin/events/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteEvent(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Event not found' }, 404)
  return c.json({ success: true })
})

app.get('/api/admin/installations', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listInstallations(false) })
})

app.post('/api/admin/installations', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  const body = formText(form, 'body')
  if (!title || !body) return c.json({ success: false, message: 'Title and details are required' }, 400)
  const cover = await uploadFormImage(form.get('cover'), 'tarumed/installations', slugifyName(title) || 'install')
  const item = await createInstallation({
    title,
    facility: formText(form, 'facility'),
    location: formText(form, 'location'),
    body,
    productIds: csvIds(formText(form, 'productIds')),
    categoryIds: csvIds(formText(form, 'categoryIds')),
    cover,
    published: formChecked(form, 'published'),
  })
  return c.json({ success: true, data: item })
})

app.patch('/api/admin/installations/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getInstallationById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Installation not found' }, 404)
  const form = await c.req.formData()
  const title = formText(form, 'title') || existing.title
  let cover = existing.cover
  const uploaded = await uploadFormImage(form.get('cover'), 'tarumed/installations', slugifyName(title) || 'install')
  if (uploaded) cover = uploaded
  if (formText(form, 'removeImage') === 'true') cover = null
  const item = await updateInstallation(c.req.param('id'), {
    title,
    slug: slugifyName(title) || existing.slug,
    facility: formText(form, 'facility'),
    location: formText(form, 'location'),
    body: formText(form, 'body') || existing.body,
    productIds: csvIds(formText(form, 'productIds')),
    categoryIds: csvIds(formText(form, 'categoryIds')),
    cover,
    published: formChecked(form, 'published'),
  })
  return c.json({ success: true, data: item })
})

app.delete('/api/admin/installations/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteInstallation(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Installation not found' }, 404)
  return c.json({ success: true })
})

app.get('/api/admin/company-profile', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  return c.json({ success: true, data: await listCompanyProfilePages(false) })
})

app.post('/api/admin/company-profile', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const title = formText(form, 'title')
  if (!title) return c.json({ success: false, message: 'Title is required' }, 400)
  const image = await uploadFormImage(form.get('image'), 'tarumed/profile', slugifyName(title) || 'profile')
  const item = await createCompanyProfilePage({
    title,
    body: formText(form, 'body'),
    image,
    order: Number(formText(form, 'order') || '0') || 0,
    published: formChecked(form, 'published'),
  })
  return c.json({ success: true, data: item })
})

app.patch('/api/admin/company-profile/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const existing = await getCompanyProfilePageById(c.req.param('id'))
  if (!existing) return c.json({ success: false, message: 'Profile page not found' }, 404)
  const form = await c.req.formData()
  const title = formText(form, 'title') || existing.title
  let image = existing.image
  const uploaded = await uploadFormImage(form.get('image'), 'tarumed/profile', slugifyName(title) || 'profile')
  if (uploaded) {
    if (existing.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
    image = uploaded
  }
  if (formText(form, 'removeImage') === 'true') {
    if (image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(image.publicId).catch(() => undefined)
    image = null
  }
  const item = await updateCompanyProfilePage(c.req.param('id'), {
    title,
    body: formText(form, 'body'),
    image,
    order: Number(formText(form, 'order') || String(existing.order)) || existing.order,
    published: formChecked(form, 'published'),
  })
  return c.json({ success: true, data: item })
})

app.delete('/api/admin/company-profile/:id', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const removed = await deleteCompanyProfilePage(c.req.param('id'))
  if (!removed) return c.json({ success: false, message: 'Profile page not found' }, 404)
  if (removed.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(removed.image.publicId).catch(() => undefined)
  return c.json({ success: true })
})

app.post('/api/admin/company-profile/pdf', async (c) => {
  const auth = requireAdmin(c)
  if (auth.error) return c.json(auth.error, auth.status)
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File) || file.size <= 0) return c.json({ success: false, message: 'Upload a PDF company profile' }, 400)
  const pages = await replaceCompanyProfileFromPdf(Buffer.from(await file.arrayBuffer()), file.name || 'profile.pdf')
  return c.json({ success: true, count: pages.length, data: pages })
})

export default app
