'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { PLACEHOLDER_IMAGE, productHref, productImageSrc, type CatalogProduct } from '@/lib/catalog'
import type { Catalogue } from '@/lib/content'
import { useQuoteCart } from '@/components/quote-cart'

export function ProductCard({
  product,
}: {
  product: CatalogProduct
  showPrice?: boolean
  catalogues?: Array<Pick<Catalogue, '_id' | 'erpProductId' | 'createdAt'>>
  variant?: 'shop' | 'home'
}) {
  const router = useRouter()
  const { add, has } = useQuoteCart()
  const inCart = has(product.id)

  function requestQuote() {
    add(product)
    router.push(ROUTES.quote)
  }

  return (
    <article className="product-card home-card">
      <Link href={productHref(product)} className="product-card-link">
        <div className="product-image">
          <img
            src={productImageSrc(product)}
            alt={product.name}
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) {
                event.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
          />
          {product.productType && <span className="product-tag">{product.productType}</span>}
        </div>
        <div className="product-info">
          <h3>{product.name}</h3>
        </div>
      </Link>
      <div className="product-card-actions home-split">
        <button type="button" className={inCart ? 'add-quote-btn in-cart' : 'add-quote-btn'} onClick={requestQuote}>
          Request Quote
        </button>
        <Link href={productHref(product)} className="view-product-btn">
          View <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  )
}
