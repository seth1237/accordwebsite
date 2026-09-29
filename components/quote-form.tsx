'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'
import { ProductShare } from '@/components/product-share'
import { ViewCatalogueButton } from '@/components/view-catalogue-button'
import { useQuoteCart } from '@/components/quote-cart'
import { productHref, type CatalogProduct } from '@/lib/catalog'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function productPageUrl(product: { slug: string; id?: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : COMPANY.url
  return `${origin}${productHref(product)}`
}

function whatsappHref(product: CatalogProduct) {
  const text = `Hello Accord, I would like a quote for ${product.name}.\n${productPageUrl(product)}`
  return `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(text)}`
}

export function QuoteForm({
  product,
  catalogueHref = '',
}: {
  product: CatalogProduct
  catalogueHref?: string
}) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const { add, has } = useQuoteCart()
  const inCart = has(product.id)

  function changeQty(next: number) {
    setQuantity(Math.max(1, Math.min(1000, next)))
  }

  function requestQuote() {
    add(product, quantity)
    router.push(ROUTES.quote)
  }

  return (
    <div className="product-buybox">
      <div className="product-qty">
        <span>Quantity</span>
        <div className="qty-stepper">
          <button type="button" aria-label="Decrease quantity" onClick={() => changeQty(quantity - 1)}>
            <Minus size={14} />
          </button>
          <strong>{quantity}</strong>
          <button type="button" aria-label="Increase quantity" onClick={() => changeQty(quantity + 1)}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="product-cta-row">
        <button type="button" className="button button-primary product-quote-btn" onClick={requestQuote}>
          Request Quote
        </button>
        <ViewCatalogueButton product={product} href={catalogueHref} />
      </div>
      <div className="product-secondary-actions">
        <button type="button" className="text-link" onClick={() => add(product, quantity)}>
          {inCart ? 'Added to quote cart' : 'Add to quote cart'}
        </button>
        <a className="wa-button" href={whatsappHref(product)} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
          WhatsApp
        </a>
        <ProductShare product={product} />
      </div>
    </div>
  )
}
