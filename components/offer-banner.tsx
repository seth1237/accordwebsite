import Link from 'next/link'
import { getSiteBootstrap } from '@/lib/site-data'

export async function OfferBanner() {
  const { offer, headerOffers } = await getSiteBootstrap().catch(() => ({ offer: null, headerOffers: [] }))
  if (!offer || headerOffers.length) return null
  return (
    <section className="offer-banner">
      <div className="shell offer-banner-row">
        <div>
          <span className="kicker">On offer now</span>
          <strong>{offer.title}</strong>
          <p>{offer.discountText || (offer.price ? `Cash price KES ${offer.price.toLocaleString('en-KE')}` : offer.description)}</p>
        </div>
        <Link href="/offers" className="button button-primary">Shop the offer</Link>
      </div>
    </section>
  )
}
