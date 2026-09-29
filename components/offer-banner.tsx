import Link from 'next/link'
import { listOffers } from '@/lib/content-data'

export async function OfferBanner() {
  const offers = await listOffers(true).catch(() => [])
  const offer = offers[0]
  if (!offer) return null
  return (
    <section className="offer-banner">
      <div className="shell offer-banner-row">
        <div>
          <span className="kicker">Current offer</span>
          <strong>{offer.title}</strong>
          <p>{offer.discountText || offer.description}</p>
        </div>
        <Link href="/offers" className="button button-primary">View offers</Link>
      </div>
    </section>
  )
}
