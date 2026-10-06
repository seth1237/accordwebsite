import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CatalogBrowser } from '@/components/catalog-browser'
import { ShopShell } from '@/components/shop-shell'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getCatalog, getPriceVisibility, listCatalogues } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: 'Medical Equipment & Laboratory Supplies Catalogue | Accord',
  description:
    'Browse medical equipment, laboratory analysers, hospital furniture, maternity, imaging and ICU products from Accord Medical Supplies in Kenya. Request a quote from the catalogue.',
  path: ROUTES.products,
  absoluteTitle: true,
})

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
          <Breadcrumbs items={[HOME_CRUMB, { name: 'Products', path: ROUTES.products }]} />
          <span className="kicker">Shop catalogue</span>
          <h1 className="page-title">Medical equipment <em>catalogue.</em></h1>
          <p className="hero-lede">
            Laboratory analysers, hospital furniture, maternity, theatre, imaging and homecare equipment listed for
            hospitals and clinics in Kenya.
          </p>
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
