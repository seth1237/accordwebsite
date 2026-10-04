'use client'

import Link from 'next/link'
import type { CatalogProduct } from '@/lib/catalog'
import { productHref } from '@/lib/catalog'
import type { Offer } from '@/lib/content'
import { offerWhatsAppText } from '@/lib/offers'
import { trackOfferEvent } from '@/lib/offer-track'
import { COMPANY } from '@/lib/utils'

export function OfferActions({ offer, products }: { offer: Offer; products: CatalogProduct[] }) {
  const lead = products[0]
  const href = lead ? productHref(lead) : '/products'
  const pageUrl = `${typeof window !== 'undefined' ? window.location.origin : COMPANY.url}${href}`
  const wa = `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(offerWhatsAppText(offer.title, pageUrl, offer.price || lead?.price))}`

  function markClick() {
    if (!lead) return
    trackOfferEvent({ type: 'click', productId: lead.id, productName: lead.name, offerId: offer._id })
  }

  function markWhatsApp() {
    const targets = products.length ? products : [{ id: offer.customProductId || offer._id, name: offer.title }]
    for (const item of targets) {
      if (!item.id) continue
      trackOfferEvent({ type: 'whatsapp', productId: item.id, productName: item.name, offerId: offer._id })
    }
  }

  return (
    <div className="offer-actions">
      <Link href={href} className="button button-primary" onClick={markClick}>
        {lead ? 'View product' : 'Browse products'}
      </Link>
      <a className="wa-button" href={wa} target="_blank" rel="noopener noreferrer" onClick={markWhatsApp}>
        Request on WhatsApp
      </a>
    </div>
  )
}
