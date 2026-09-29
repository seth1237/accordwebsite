'use client'

import { useMemo } from 'react'
import type { CatalogProduct } from '@/lib/catalog'
import type { Catalogue } from '@/lib/content'
import { useQuoteCart } from '@/components/quote-cart'
import { RelatedProducts } from '@/components/related-products'

export function QuoteInterestCarousel({
  products,
  showPrices,
  catalogues = [],
}: {
  products: CatalogProduct[]
  showPrices: boolean
  catalogues?: Array<Pick<Catalogue, '_id' | 'erpProductId' | 'createdAt'>>
}) {
  const { items } = useQuoteCart()

  const related = useMemo(() => {
    const cartIds = new Set(items.map((item) => item.id))
    const categories = new Set(items.map((item) => item.categoryName))
    const linked = products.filter((product) => !cartIds.has(product.id) && categories.has(product.categoryName))
    const popular = products
      .filter((product) => !cartIds.has(product.id) && !categories.has(product.categoryName))
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.name.localeCompare(b.name))
    const mixed = items.length ? [...linked, ...popular] : popular
    const unique: CatalogProduct[] = []
    const seen = new Set<string>()
    for (const product of mixed) {
      if (seen.has(product.id)) continue
      seen.add(product.id)
      unique.push(product)
      if (unique.length >= 12) break
    }
    return unique
  }, [items, products])

  if (related.length < 2) return null

  return (
    <RelatedProducts
      products={related}
      showPrices={showPrices}
      catalogues={catalogues}
      kicker={items.length ? 'Linked to your quote' : 'Highest interest'}
      title={items.length ? 'Products related to your quote' : 'Products of highest interest'}
    />
  )
}
