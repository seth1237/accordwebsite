import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { OfferActions } from '@/components/offer-actions'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { formatKes, productHref } from '@/lib/catalog'
import { offerHref } from '@/lib/content'
import { offerPriceForProduct } from '@/lib/offers'
import { getCatalog, listOffers } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Current Equipment Offers',
  description: 'Cash-price offers and package deals from Accord Medical Supplies in Kenya.',
  path: ROUTES.offers,
})

export default async function OffersPage() {
  const [items, catalog] = await Promise.all([
    listOffers(true).catch(() => []),
    getCatalog().catch(() => ({ products: [], categories: [] })),
  ])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Current deals</span>
        <h1 className="page-title">Active <em>offers.</em></h1>
        <p className="hero-lede">Priced deals and featured machines. Request on WhatsApp or open the product.</p>
        {items.length === 0 && <p className="empty-state">No offers are running right now.</p>}
        <div className="offer-list">
          {items.map((item) => {
            const linked = catalog.products.filter((product) => item.productIds.includes(product.id) || product.id === item.customProductId)
            return (
              <article className="offer-card" key={item._id}>
                {item.banner && <img className="offer-image" src={item.banner.secureUrl} alt={item.seo?.imageAlt || item.title} />}
                <div className="post-meta">
                  <span>{item.discountText || (item.price ? formatKes(item.price) : 'Offer')}</span>
                  <span>Until {new Date(item.endDate).toLocaleDateString('en-KE')}</span>
                </div>
                <h3><Link href={offerHref(item)}>{item.title}</Link></h3>
                {item.kind === 'custom' && item.showPrice !== false && item.price > 0 && <p className="offer-cash">{formatKes(item.price)}</p>}
                {item.description ? <p>{item.description}</p> : null}
                {linked.length > 0 && (
                  <ul className="offer-products">
                    {linked.map((product) => {
                      const deal = offerPriceForProduct(item, product.id)
                      const cash = deal.price || product.price
                      return (
                        <li key={product.id}>
                          <Link href={productHref(product)}>{product.name}</Link>
                          {deal.showPrice && cash > 0 ? (
                            <span>
                              {deal.compareAt > cash ? <s>{formatKes(deal.compareAt)}</s> : null}
                              {formatKes(cash)}
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <OfferActions offer={item} products={linked} />
              </article>
            )
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
