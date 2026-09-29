import { toProduct, type CatalogProduct, type ShopItem } from '@/lib/catalog'

export const ACCORD_SHOP_URL = 'https://accordmedical.co.ke'
export const ACCORD_CATALOG_URL = `${ACCORD_SHOP_URL}/api/get_spdk_items.php`

const CACHE_MS = 10 * 60 * 1000

type ShopResponse = {
  status?: string
  total?: number
  data?: ShopItem[]
}

type Cache = { at: number; products: CatalogProduct[] }

let cache: Cache = { at: 0, products: [] }

export async function fetchAccordProducts(): Promise<CatalogProduct[]> {
  if (Date.now() - cache.at < CACHE_MS && cache.products.length) {
    return cache.products
  }

  try {
    const response = await fetch(ACCORD_CATALOG_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'AccordWebsite/1.0',
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`Product fetch failed (${response.status})`)
    }
    const data = (await response.json()) as ShopResponse
    if (data.status !== 'success' || !Array.isArray(data.data)) {
      throw new Error('Product fetch failed')
    }
    const products = data.data.map(toProduct).filter((product): product is CatalogProduct => Boolean(product))
    if (!products.length) throw new Error('Product fetch failed')
    cache = { at: Date.now(), products }
    return products
  } catch (error) {
    if (cache.products.length) return cache.products
    throw error
  }
}
