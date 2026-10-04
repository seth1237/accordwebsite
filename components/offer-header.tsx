import Link from 'next/link'
import { PLACEHOLDER_IMAGE, formatKes, productHref, type CatalogProduct } from '@/lib/catalog'
import { ROUTES } from '@/lib/routes'

export type OfferHeaderProduct = Pick<CatalogProduct, 'id' | 'name' | 'slug' | 'image' | 'price' | 'offerId'>

function looped(products: OfferHeaderProduct[]) {
  if (!products.length) return []
  const half = [...products]
  while (half.length < 8) half.push(...products)
  return half
}

function endsLabel(endsAt?: string) {
  if (!endsAt) return ''
  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return ''
  const ms = end.getTime() - Date.now()
  if (ms <= 0) return 'Ends today'
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours < 48) return `Ends in ${hours}h`
  return `Ends ${end.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
}

function OfferChip({ product, showPrice }: { product: OfferHeaderProduct; showPrice: boolean }) {
  return (
    <Link href={productHref(product)} className="offer-header-chip" title={product.name}>
      <img src={product.image || PLACEHOLDER_IMAGE} alt="" />
      <span>
        <b>{product.name}</b>
        {showPrice && product.price > 0 ? <small>{formatKes(product.price)}</small> : null}
      </span>
    </Link>
  )
}

function OfferChipFace({ product, showPrice }: { product: OfferHeaderProduct; showPrice: boolean }) {
  return (
    <span className="offer-header-chip">
      <img src={product.image || PLACEHOLDER_IMAGE} alt="" />
      <span>
        <b>{product.name}</b>
        {showPrice && product.price > 0 ? <small>{formatKes(product.price)}</small> : null}
      </span>
    </span>
  )
}

export function OfferHeader({
  title,
  discountText,
  endsAt,
  products,
  showPrices = true,
}: {
  title: string
  discountText?: string
  endsAt?: string
  products: OfferHeaderProduct[]
  showPrices?: boolean
}) {
  const items = looped(products)
  const until = endsLabel(endsAt)
  const line = discountText || title
  const duration = Math.max(18, items.length * 3.2)

  return (
    <div className="offer-header" role="region" aria-label="Current offer">
      <div className="shell offer-header-inner">
        <div className="offer-header-copy">
          <span className="offer-header-kicker">On offer</span>
          <strong>{line}</strong>
          {until ? <em>{until}</em> : null}
        </div>
        {items.length > 0 && (
          <div className="offer-header-marquee">
            <div className="offer-header-track" style={{ animationDuration: `${duration}s` }}>
              <div className="offer-header-set">
                {items.map((product, index) => (
                  <OfferChip key={`${product.id}-${index}`} product={product} showPrice={showPrices} />
                ))}
              </div>
              <div className="offer-header-set" aria-hidden="true">
                {items.map((product, index) => (
                  <OfferChipFace key={`${product.id}-loop-${index}`} product={product} showPrice={showPrices} />
                ))}
              </div>
            </div>
          </div>
        )}
        <Link href={ROUTES.offers} className="offer-header-cta">Shop offer</Link>
      </div>
    </div>
  )
}
