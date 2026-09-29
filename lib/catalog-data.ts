import 'server-only'

import { cache } from 'react'
import { lastCatalog, readDevCatalogCache, writeDevCatalogCache } from '@/lib/catalog-cache'
import { fetchAccordProducts } from '@/lib/accord-shop'
import {
  assignSlugs,
  categoriesFromProducts,
  mergeOverlay,
  type Catalog,
  type CatalogProduct,
} from '@/lib/catalog'
import { getProductMetricsMap, getProductContentMap, getSiteSettings, type ProductContent } from '@/lib/mongodb'
import { isMysqlConfigured, mysqlIsLocalCatalogReady, mysqlListCatalogProducts } from '@/lib/mysql'

function catalogSource() {
  const value = String(process.env.CATALOG_SOURCE || 'auto').trim().toLowerCase()
  if (value === 'mysql' || value === 'local') return 'mysql'
  if (value === 'remote') return 'remote'
  return 'auto'
}

async function loadRawProducts(): Promise<CatalogProduct[]> {
  const source = catalogSource()
  if (source === 'remote') return fetchAccordProducts().catch(() => [] as CatalogProduct[])
  if (isMysqlConfigured()) {
    const local = await mysqlListCatalogProducts().catch(() => [] as CatalogProduct[])
    if (source === 'mysql') return local
    const ready = await mysqlIsLocalCatalogReady().catch(() => false)
    if (ready && local.length) return local
  }
  return fetchAccordProducts().catch(() => [] as CatalogProduct[])
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

export async function getCatalog(categoryIds?: string[]): Promise<Catalog> {
  const [base, metrics] = await Promise.all([
    getCatalogBase(categoryIds?.slice().sort().join(',') || ''),
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
    if (!categoryIds?.length) await writeDevCatalogCache(catalog)
    return catalog
  }

  if (categoryIds?.length) return catalog

  const cached = lastCatalog() || (await readDevCatalogCache())
  if (cached?.products.length) return cached
  return catalog
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
