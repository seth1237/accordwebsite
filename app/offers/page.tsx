import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { listOffers } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const items = await listOffers(true).catch(() => [])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Current deals</span>
        <h1 className="page-title">Active <em>offers.</em></h1>
        <p className="hero-lede">Time-limited pricing and package deals from the catalogue.</p>
        {items.length === 0 && <p className="empty-state">No offers are running right now.</p>}
        <div className="post-grid">
          {items.map((item) => (
            <article className="post-card" key={item._id}>
              {item.banner && <img className="offer-image" src={item.banner.secureUrl} alt="" />}
              <div className="post-meta">
                <span>{item.discountText || 'Offer'}</span>
                <span>Until {new Date(item.endDate).toLocaleDateString('en-KE')}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link href="/products" className="text-link">Browse products</Link>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
