import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { HashRedirect } from '@/components/hash-redirect'
import { OfferBanner } from '@/components/offer-banner'
import { ProductCard } from '@/components/product-card'
import { ShopShell } from '@/components/shop-shell'
import { homepageProducts } from '@/lib/catalog'
import { getCatalog, getPriceVisibility } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [catalog, showPrices] = await Promise.all([getCatalog(), getPriceVisibility()])
  const featured = homepageProducts(catalog.products, 12)

  return (
    <main className="min-h-screen">
      <HashRedirect />
      <SiteHeader />
      <OfferBanner />
      <ShopShell>
        <section id="products" className="catalog-section">
          <div className="section-heading">
            <div>
              <span className="kicker">Featured equipment</span>
              <h2>Selected products</h2>
            </div>
            <Link href="/products" className="text-link">View all products</Link>
          </div>
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} showPrice={showPrices} variant="home" />
            ))}
          </div>
          {featured.length === 0 && (
            <p className="empty-state">The shop catalogue is unavailable right now. Please refresh in a moment.</p>
          )}
        </section>
      </ShopShell>
      <SiteFooter />
    </main>
  )
}
