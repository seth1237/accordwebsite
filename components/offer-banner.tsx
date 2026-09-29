import Link from 'next/link'
import { getSiteBootstrap } from '@/lib/site-data'

export async function OfferBanner() {
  const { offer } = await getSiteBootstrap().catch(() => ({ offer: null }))
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
