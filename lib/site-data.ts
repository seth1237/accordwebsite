import { cache } from 'react'
import { cookies } from 'next/headers'
import { accordApiPath } from '@/lib/backend-url'
import type { Catalog, CatalogProduct } from '@/lib/catalog'
import type { Catalogue, CompanyProfilePage, EventPost, Installation, ManufacturerSubmission, Offer, RedirectRule } from '@/lib/content'
import type { JobPost } from '@/lib/jobs'
import { emptyVisitorReport, parsePeriod, type VisitorPeriod } from '@/lib/visitor-report'

type Bootstrap = {
  catalog: Catalog
  showPrices: boolean
  jobCount: number
  offer: Offer | null
}

const emptyCatalog: Catalog = { products: [], categories: [] }

const emptyBootstrap: Bootstrap = {
  catalog: emptyCatalog,
  showPrices: true,
  jobCount: 0,
  offer: null,
}

function isRetryableFetchError(error: unknown) {
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code
    || (error as { code?: string }).code
  return code === 'ECONNREFUSED' || code === 'ECONNRESET'
}

function fetchErrorLabel(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code
    || (error as { code?: string }).code
  return code || (error instanceof Error ? error.message : 'failed')
}

async function backendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  try {
    const store = await cookies()
    const cookie = store.getAll().map((item) => `${item.name}=${item.value}`).join('; ')
    if (cookie) headers.set('cookie', cookie)
  } catch {}
  const timeoutMs = path.includes('/bootstrap') ? 30_000 : 12_000
  return fetch(accordApiPath(path), {
    ...init,
    headers,
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  })
}

async function backendJson<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const retries = path.includes('/bootstrap') ? 6 : 1
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await backendFetch(path, init)
      const payload = await response.json().catch(() => ({})) as T & { success?: boolean; message?: string }
      if (!response.ok) return null
      return payload
    } catch (error) {
      const retry = attempt < retries && isRetryableFetchError(error)
      if (retry) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 300))
        continue
      }
      console.error(`Accord API ${path} failed (${fetchErrorLabel(error)})`)
      return null
    }
  }
  return null
}

const BOOTSTRAP_TTL_MS = 15_000
const globalForSite = globalThis as typeof globalThis & {
  __accordBootstrap?: { at: number; data: Bootstrap }
  __accordBootstrapInflight?: Promise<Bootstrap>
}

export const getSiteBootstrap = cache(async (): Promise<Bootstrap> => {
  const hit = globalForSite.__accordBootstrap
  if (hit && Date.now() - hit.at < BOOTSTRAP_TTL_MS) return hit.data
  if (globalForSite.__accordBootstrapInflight) return globalForSite.__accordBootstrapInflight

  globalForSite.__accordBootstrapInflight = (async () => {
    const payload = await backendJson<Bootstrap & { success: boolean }>('/api/site/bootstrap')
    const data = payload ? {
      catalog: payload.catalog || emptyCatalog,
      showPrices: payload.showPrices !== false,
      jobCount: Number(payload.jobCount) || 0,
      offer: payload.offer || null,
    } : emptyBootstrap
    if (payload?.catalog?.products?.length) globalForSite.__accordBootstrap = { at: Date.now(), data }
    return data
  })().finally(() => {
    globalForSite.__accordBootstrapInflight = undefined
  })

  return globalForSite.__accordBootstrapInflight
})

export async function getCatalog(categoryIds?: string[]): Promise<Catalog> {
  if (categoryIds?.length) {
    const payload = await backendJson<{ catalog: Catalog }>(`/api/catalog?categoryIds=${encodeURIComponent(categoryIds.join(','))}`)
    return payload?.catalog || emptyCatalog
  }
  return (await getSiteBootstrap()).catalog
}

export async function getCatalogProduct(idOrSlug: string): Promise<CatalogProduct | null> {
  const payload = await backendJson<{ data: CatalogProduct }>(`/api/products/${encodeURIComponent(idOrSlug)}`)
  return payload?.data || null
}

export async function getRelatedProducts(product: CatalogProduct, limit = 8): Promise<CatalogProduct[]> {
  const catalog = await getCatalog()
  return catalog.products
    .filter((item) => item.categoryId === product.categoryId && item.slug !== product.slug)
    .slice(0, limit)
}

export async function getPriceVisibility() {
  return (await getSiteBootstrap()).showPrices
}

export async function listJobs(publishedOnly = false): Promise<JobPost[]> {
  const path = publishedOnly ? '/api/jobs' : '/api/admin/jobs'
  const payload = await backendJson<{ data: JobPost[] }>(path)
  return payload?.data || []
}

export async function getJobBySlug(slug: string): Promise<JobPost | null> {
  const payload = await backendJson<{ data: JobPost }>(`/api/jobs/${encodeURIComponent(slug)}`)
  return payload?.data || null
}

export async function listOffers(publishedOnly = true): Promise<Offer[]> {
  const path = publishedOnly ? '/api/offers' : '/api/admin/offers'
  const payload = await backendJson<{ data: Offer[] }>(path)
  return payload?.data || []
}

export async function listEvents(publishedOnly = true): Promise<EventPost[]> {
  const path = publishedOnly ? '/api/events' : '/api/admin/events'
  const payload = await backendJson<{ data: EventPost[] }>(path)
  return payload?.data || []
}

export async function getEventBySlug(slug: string): Promise<EventPost | null> {
  const payload = await backendJson<{ data: EventPost }>(`/api/events/${encodeURIComponent(slug)}`)
  return payload?.data || null
}

export async function listInstallations(publishedOnly = true): Promise<Installation[]> {
  const path = publishedOnly ? '/api/installations' : '/api/admin/installations'
  const payload = await backendJson<{ data: Installation[] }>(path)
  return payload?.data || []
}

export async function getInstallationBySlug(slug: string): Promise<Installation | null> {
  const payload = await backendJson<{ data: Installation }>(`/api/installations/${encodeURIComponent(slug)}`)
  return payload?.data || null
}

export async function listCompanyProfilePages(publishedOnly = true): Promise<CompanyProfilePage[]> {
  const path = publishedOnly ? '/api/company-profile' : '/api/admin/company-profile'
  const payload = await backendJson<{ data: CompanyProfilePage[] }>(path)
  return payload?.data || []
}

export async function listCatalogues(): Promise<Catalogue[]> {
  const payload = await backendJson<{ data: Catalogue[] }>('/api/catalogues')
  return payload?.data || []
}

export async function listRedirects(): Promise<RedirectRule[]> {
  const payload = await backendJson<{ data: RedirectRule[] }>('/api/admin/redirects')
  return payload?.data || []
}

export async function listManufacturers() {
  const payload = await backendJson<{ data: ManufacturerSubmission[] }>('/api/admin/manufacturers')
  return payload?.data || []
}

export async function catalogueAnalytics() {
  const payload = await backendJson<{ data: { total?: number; catalogues?: Catalogue[]; recent?: unknown[] } }>('/api/admin/catalogues')
  return {
    total: Number(payload?.data?.total) || 0,
    catalogues: payload?.data?.catalogues || [],
    recent: payload?.data?.recent || [],
  }
}

export async function getCategoryPerformance() {
  const payload = await backendJson<{ data: Awaited<ReturnType<typeof import('@/lib/mongodb').getCategoryPerformance>> }>('/api/admin/performance')
  return payload?.data || []
}

export async function getVisitorStats() {
  const payload = await backendJson<{ data: Awaited<ReturnType<typeof import('@/lib/mongodb').getVisitorStats>> }>('/api/admin/visitors')
  return payload?.data || {
    today: { date: '', visitors: 0, pageviews: 0 },
    days: [],
  }
}

export async function getVisitorReport(query?: { period?: VisitorPeriod; from?: string; to?: string }) {
  const period = parsePeriod(query?.period)
  const params = new URLSearchParams()
  params.set('period', period)
  if (query?.from) params.set('from', query.from)
  if (query?.to) params.set('to', query.to)
  const payload = await backendJson<{ data: Awaited<ReturnType<typeof import('@/lib/mongodb').getVisitorReport>> }>(`/api/admin/visitors?${params}`)
  return payload?.data || emptyVisitorReport(period)
}

export async function siteJobCount() {
  return (await getSiteBootstrap()).jobCount
}
