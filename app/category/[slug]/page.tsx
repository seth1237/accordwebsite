import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CatalogBrowser } from '@/components/catalog-browser'
import { ShopShell } from '@/components/shop-shell'
import { publicCategorySlug, resolveCategorySlug } from '@/lib/catalog'
import { getCatalog, getPriceVisibility, listCatalogues } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const key = decodeURIComponent(slug).trim()
  const canonical = resolveCategorySlug(key)
  if (canonical !== key) redirect(`/category/${canonical}`)
  const [catalog, showPrices, catalogues] = await Promise.all([getCatalog(), getPriceVisibility(), listCatalogues().catch(() => [])])
  const category = catalog.categories.find((item) => item.slug === canonical || publicCategorySlug(item.name) === canonical)
  if (!category) notFound()
  const products = catalog.products.filter((product) => publicCategorySlug(product.categoryName) === category.slug || product.categoryId === category.slug)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <ShopShell activeSlug={category.slug}>
        <section id="products" className="section">
          <span className="kicker">Category</span>
          <h1 className="page-title">{category.name}</h1>
          <p className="hero-lede">{products.length} products in this department.</p>
          <div className="catalog-body">
            <Suspense>
              <CatalogBrowser
                catalog={{ ...catalog, products, categories: [{ ...category, count: products.length }] }}
                showPrices={showPrices}
                catalogues={catalogues}
              />
            </Suspense>
          </div>
        </section>
      </ShopShell>
      <SiteFooter />
    </main>
  )
}
