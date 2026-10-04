import type { CatalogProduct } from '@/lib/catalog'
import type { Offer } from '@/lib/content'

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
    const cash = Number(offer.price) || 0
    const was = Number(offer.compareAt) || product.price
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
