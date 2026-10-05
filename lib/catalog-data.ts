import { cache } from 'react'
import { lastCatalog, readDevCatalogCache, writeDevCatalogCache, clearCatalogCache } from '@/lib/catalog-cache'
import {
  assignSlugs,
  categoriesFromProducts,
  mergeCatalogCategories,
  mergeOverlay,
  publicCategorySlug,
  type Catalog,
  type CatalogCategory,
  type CatalogProduct,
} from '@/lib/catalog'
import { getProductMetricsMap, getProductContentMap, getSiteSettings, type ProductContent } from '@/lib/mongodb'
import type { Offer } from '@/lib/content'
import { applyOffersToProducts, isOfferLive } from '@/lib/offers'
import {
  isMysqlConfigured,
  mysqlCreateCatalogProduct,
  mysqlCreateCategory,
  mysqlEnsureCategory,
  mysqlListCategories,
  mysqlListCatalogProducts,
  mysqlListDocs,
  mysqlSetLocalCatalogReady,
} from '@/lib/mysql'

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

let catalogGeneration = 0

export async function invalidateCatalog() {
  catalogGeneration += 1
  const state = catalogMemoState()
  state.memo = null
  state.inflight.clear()
  await clearCatalogCache()
}

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

const getCatalogBase = cache(async (categoryKey: string, generation: number): Promise<Catalog> => {
  void generation
  const categoryIds = categoryKey ? categoryKey.split(',') : undefined
  const [rawProducts, content, storedCategories] = await Promise.all([
    loadRawProducts(),
    getProductContentMap().catch(() => new Map<string, ProductContent>()),
    mysqlListCategories().catch(() => [] as CatalogCategory[]),
  ])

  const merged = assignSlugs(
    rawProducts.map((product) => mergeOverlay(product, content.get(product.id))),
  )

  const products = categoryIds?.length
    ? merged.filter((product) => categoryIds.includes(product.categoryId) || categoryIds.includes(product.categoryName))
    : merged

  return {
    products,
    categories: mergeCatalogCategories(storedCategories, categoriesFromProducts(categoryIds?.length ? merged : products)),
  }
})

async function loadCatalog(key: string, categoryIds?: string[]): Promise<Catalog> {
  const [base, metrics] = await Promise.all([
    getCatalogBase(key, catalogGeneration),
    getProductMetricsMap().catch(() => new Map()),
  ])

  const offers = await mysqlListDocs<Offer>('offer', true).catch(() => [])
  const liveOffers = offers.filter((offer) => isOfferLive(offer))
  const catalog: Catalog = {
    products: applyOffersToProducts(
      base.products.map((product) => {
        const stats = metrics.get(product.id)
        return { ...product, clicks: stats?.clicks || 0, shares: stats?.shares || 0 }
      }),
      liveOffers,
    ),
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

export async function createCatalogCategory(input: { name: string; description?: string }) {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured')
  const category = await mysqlCreateCategory(input)
  await invalidateCatalog()
  return category
}

export async function createCatalogProduct(input: {
  name: string
  description?: string
  details?: string
  categoryId?: string
  categoryName?: string
  manufacturer?: string
  price?: number
  inStock?: boolean
  featured?: boolean
  seo?: CatalogProduct['seo']
  slug?: string
}) {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured')
  const name = String(input.name || '').trim()
  if (!name) throw new Error('Enter a product name')
  let categoryName = String(input.categoryName || '').trim()
  let categoryId = String(input.categoryId || '').trim()
  if (!categoryName && categoryId) {
    const [stored, catalog] = await Promise.all([
      mysqlListCategories().catch(() => []),
      getCatalog().catch(() => ({ products: [], categories: [] as CatalogCategory[] })),
    ])
    categoryName =
      catalog.categories.find((item) => item.slug === categoryId || item._id === categoryId)?.name
      || stored.find((item) => item.slug === categoryId || item._id === categoryId)?.name
      || categoryId
  }
  if (!categoryName) throw new Error('Choose or enter a category')
  const category = await mysqlEnsureCategory({ name: categoryName, slug: categoryId || publicCategorySlug(categoryName) })
  const product = await mysqlCreateCatalogProduct({
    name,
    description: input.description,
    details: input.details || input.description,
    categoryId: category.slug,
    categoryName: category.name,
    manufacturer: input.manufacturer,
    price: input.price,
    inStock: input.inStock,
    featured: input.featured,
    seo: input.seo,
    slug: input.slug,
  })
  await mysqlSetLocalCatalogReady(true).catch(() => null)
  await invalidateCatalog()
  return product
}
