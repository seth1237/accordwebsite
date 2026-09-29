'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import type { CatalogProduct } from '@/lib/catalog'
import type { Catalogue } from '@/lib/content'

export function RelatedProducts({
  products,
  showPrices,
  catalogues = [],
  kicker = 'Also of interest',
  title = 'Other products of interest',
}: {
  products: CatalogProduct[]
  showPrices: boolean
  catalogues?: Array<Pick<Catalogue, '_id' | 'erpProductId' | 'createdAt'>>
  kicker?: string
  title?: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const moving = products.length > 2
  const looped = moving ? [...products, ...products] : products

  function scrollByCard(direction: number) {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.classList.add('is-paused')
    scroller.scrollBy({ left: direction * 280, behavior: 'smooth' })
    window.setTimeout(() => scroller.classList.remove('is-paused'), 900)
  }

  return (
    <section className="related-section">
      <div className="shell">
        <div className="section-heading">
          <div>
            <span className="kicker">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <div className="related-controls">
            <button type="button" className="related-arrow" onClick={() => scrollByCard(-1)} aria-label="Previous products">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="related-arrow" onClick={() => scrollByCard(1)} aria-label="Next products">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className={moving ? 'related-scroller is-moving' : 'related-scroller'} ref={scrollerRef}>
          <div className="related-track">
            {looped.map((item, index) => (
              <ProductCard key={`${item.id}-${index}`} product={item} showPrice={showPrices} catalogues={catalogues} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
