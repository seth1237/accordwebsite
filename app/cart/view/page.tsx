import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { QuoteCartPanel } from '@/components/quote-cart-panel'
import { QuoteInterestCarousel } from '@/components/quote-interest-carousel'
import { getCatalog, getPriceVisibility } from '@/lib/catalog-data'
import { listCatalogues } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export default async function CartViewPage() {
  const [catalog, showPrices, catalogues] = await Promise.all([
    getCatalog(),
    getPriceVisibility(),
    listCatalogues().catch(() => []),
  ])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section">
        <span className="kicker">Quote cart</span>
        <h1 className="page-title">Request a <em>quote.</em></h1>
        <p className="hero-lede">Add products from the catalogue, then send one request for everything you need.</p>
        <div className="catalog-body">
          <QuoteCartPanel />
        </div>
      </section>
      <QuoteInterestCarousel products={catalog.products} showPrices={showPrices} catalogues={catalogues} />
      <SiteFooter />
    </main>
  )
}
