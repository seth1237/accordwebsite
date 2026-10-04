import type { CatalogProduct } from '@/lib/catalog'
import type { Offer, OfferProductPrice } from '@/lib/content'

export const DEFAULT_OFFER_HEADER_TAGLINE = 'Happy Customer Service Week — we have customized offers just for you'
export const DEFAULT_OFFER_HEADER_CTA = 'Check out!'

export function parseOfferProductPrices(value: unknown): OfferProductPrice[] {
  let raw = value
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { return [] }
  }
  if (Array.isArray(raw)) {
    return raw.map((row) => ({
      productId: String((row as OfferProductPrice)?.productId || (row as { id?: string })?.id || ''),
      price: Number((row as OfferProductPrice)?.price) || 0,
      compareAt: Number((row as OfferProductPrice)?.compareAt) || 0,
    })).filter((row) => row.productId)
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, { price?: number; compareAt?: number } | number>).map(([productId, row]) => ({
      productId,
      price: Number(typeof row === 'number' ? row : row?.price) || 0,
      compareAt: Number(typeof row === 'number' ? 0 : row?.compareAt) || 0,
    })).filter((row) => row.productId)
  }
  return []
}

export function offerPriceForProduct(offer: Offer, productId?: string) {
  const row = productId ? (offer.productPrices || []).find((item) => item.productId === productId) : undefined
  const price = Number(row?.price) || Number(offer.price) || 0
  const compareAt = Number(row?.compareAt) || Number(offer.compareAt) || 0
  return { price, compareAt }
}

export function isOfferLive(offer: Offer, now = Date.now()) {
  if (!offer.published) return false
  const start = new Date(offer.startDate).getTime()
  const end = new Date(offer.endDate).getTime()
  return (!start || Number.isNaN(start) || start <= now) && (!end || Number.isNaN(end) || end >= now)
}

export function isOfferHeaderLive(offer: Offer, now = Date.now()) {
  return Boolean(offer.showHeader) && isOfferLive(offer, now)
}

export function offerLinkedIds(offer: Offer) {
  return [...(offer.productIds || []), offer.customProductId].filter(Boolean)
}

export function productsForHeaderOffers(products: CatalogProduct[], offers: Offer[]) {
  const headers = offers.filter((offer) => isOfferHeaderLive(offer))
  if (!headers.length) return { offer: null as Offer | null, products: [] as CatalogProduct[] }
  const ids = new Set(headers.flatMap(offerLinkedIds))
  const matched = products.filter((product) => ids.has(product.id) || headers.some((offer) => product.offerId === offer._id))
  return { offer: headers[0], products: matched.length ? matched : products.filter((product) => product.onOffer) }
}

export function applyOffersToProducts(products: CatalogProduct[], offers: Offer[]) {
  const live = offers.filter((offer) => isOfferLive(offer))
  if (!live.length) return products
  return products.map((product) => {
    const offer = live.find((item) => (item.productIds || []).includes(product.id) || item.customProductId === product.id)
    if (!offer) return product
    const { price: cash, compareAt: overrideWas } = offerPriceForProduct(offer, product.id)
    const was = overrideWas || product.price
    return {
      ...product,
      onOffer: true,
      offerId: offer._id,
      offerLabel: offer.discountText || (cash ? `Offer ${cash.toLocaleString('en-KE')}` : offer.title),
      price: cash > 0 ? cash : product.price,
      compareAt: cash > 0 && was > cash ? was : product.compareAt,
    }
  }).sort((a, b) => Number(Boolean(b.onOffer)) - Number(Boolean(a.onOffer)) || (b.clicks || 0) - (a.clicks || 0) || a.name.localeCompare(b.name))
}

export function offerWhatsAppText(name: string, url: string, price?: number) {
  const cash = price && price > 0 ? ` Cash price: KES ${price.toLocaleString('en-KE')}.` : ''
  return `Hello Accord, I want the offer on ${name}.${cash}\n${url}`
}
