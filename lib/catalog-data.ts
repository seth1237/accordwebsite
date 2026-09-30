import { cache } from 'react'
import { lastCatalog, readDevCatalogCache, writeDevCatalogCache } from '@/lib/catalog-cache'
import {
  assignSlugs,
  categoriesFromProducts,
  mergeOverlay,
  type Catalog,
  type CatalogProduct,
} from '@/lib/catalog'
import { getProductMetricsMap, getProductContentMap, getSiteSettings, type ProductContent } from '@/lib/mongodb'
import { isMysqlConfigured, mysqlListCatalogProducts, mysqlSetLocalCatalogReady } from '@/lib/mysql'

async function loadRawProducts(): Promise<CatalogProduct[]> {
  if (!isMysqlConfigured()) return []
  try {
    const local = await mysqlListCatalogProducts()
    if (local.length) void mysqlSetLocalCatalogReady(true)
    return local
  } catch {
    const cached = lastCatalog() || (await readDevCatalogCache())
    return cached?.products.length ? cached.products : []
  }
}

const CATALOG_TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 15_000

type CatalogMemoState = {
  memo: { key: string; at: number; catalog: Catalog } | null
  inflight: Map<string, Promise<Catalog>>
}

const globalForCatalog = globalThis as typeof globalThis & { __accordCatalogMemo?: CatalogMemoState }

function catalogMemoState(): CatalogMemoState {
  if (!globalForCatalog.__accordCatalogMemo) {
    globalForCatalog.__accordCatalogMemo = { memo: null, inflight: new Map() }
  }
  return globalForCatalog.__accordCatalogMemo
}

const getCatalogBase = cache(async (categoryKey: string): Promise<Catalog> => {
  const categoryIds = categoryKey ? categoryKey.split(',') : undefined
  const [rawProducts, content] = await Promise.all([
    loadRawProducts(),
    getProductContentMap().catch(() => new Map<string, ProductContent>()),
  ])

  const merged = assignSlugs(
    rawProducts.map((product) => mergeOverlay(product, content.get(product.id))),
  )

  const products = categoryIds?.length
    ? merged.filter((product) => categoryIds.includes(product.categoryId) || categoryIds.includes(product.categoryName))
    : merged

  return {
    products,
    categories: categoriesFromProducts(categoryIds?.length ? merged : products),
  }
})

async function loadCatalog(key: string, categoryIds?: string[]): Promise<Catalog> {
  const [base, metrics] = await Promise.all([
    getCatalogBase(key),
    getProductMetricsMap().catch(() => new Map()),
  ])

  const catalog: Catalog = {
    products: base.products
      .map((product) => {
        const stats = metrics.get(product.id)
        return { ...product, clicks: stats?.clicks || 0, shares: stats?.shares || 0 }
      })
      .sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name)),
    categories: base.categories,
  }

  if (catalog.products.length) {
    catalogMemoState().memo = { key, at: Date.now(), catalog }
    if (!categoryIds?.length) await writeDevCatalogCache(catalog)
    return catalog
  }

  if (categoryIds?.length) return catalog

  const cached = lastCatalog() || (await readDevCatalogCache())
  if (cached?.products.length) return cached
  return catalog
}

export async function getCatalog(categoryIds?: string[]): Promise<Catalog> {
  const key = categoryIds?.slice().sort().join(',') || ''
  const state = catalogMemoState()
  if (state.memo && state.memo.key === key && Date.now() - state.memo.at < CATALOG_TTL_MS) {
    return state.memo.catalog
  }

  const cached = !categoryIds?.length ? (lastCatalog() || (await readDevCatalogCache())) : null
  if (cached?.products.length) {
    state.memo = { key, at: Date.now(), catalog: cached }
    if (!state.inflight.has(key)) {
      const refresh = loadCatalog(key, categoryIds).finally(() => {
        state.inflight.delete(key)
      })
      state.inflight.set(key, refresh)
    }
    return cached
  }

  const pending = state.inflight.get(key)
  if (pending) return pending

  const load = loadCatalog(key, categoryIds).finally(() => {
    state.inflight.delete(key)
  })
  state.inflight.set(key, load)
  return load
}

export async function getCatalogProduct(idOrSlug: string): Promise<CatalogProduct | null> {
  const key = decodeURIComponent(idOrSlug || '').trim()
  if (!key) return null
  const catalog = await getCatalog()
  return catalog.products.find((product) => product.slug === key || product.id === key) || null
}

export async function getRelatedProducts(product: CatalogProduct, limit = 8): Promise<CatalogProduct[]> {
  const catalog = await getCatalog()
  return catalog.products
    .filter((item) => item.categoryId === product.categoryId && item.slug !== product.slug)
    .slice(0, limit)
}

export async function getPriceVisibility() {
  const settings = await getSiteSettings().catch(() => ({ showPrices: true }))
  return settings.showPrices !== false
}
