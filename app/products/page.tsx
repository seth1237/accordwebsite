import { Suspense } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CatalogBrowser } from '@/components/catalog-browser'
import { ShopShell } from '@/components/shop-shell'
import { getCatalog, getPriceVisibility, listCatalogues } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams
  const [catalog, showPrices, catalogues] = await Promise.all([
    getCatalog(params.category ? [params.category] : undefined),
    getPriceVisibility(),
    listCatalogues().catch(() => []),
  ])

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <ShopShell>
        <section id="products" className="section">
          <span className="kicker">Shop catalogue</span>
          <h1 className="page-title">All <em>products.</em></h1>
          <p className="hero-lede">Browse medical equipment and supplies currently listed in the Accord shop.</p>
          <div className="catalog-body">
            <Suspense>
              <CatalogBrowser catalog={catalog} showPrices={showPrices} initialQuery={params.q || ''} catalogues={catalogues} />
            </Suspense>
          </div>
        </section>
      </ShopShell>
      <SiteFooter />
    </main>
  )
}
