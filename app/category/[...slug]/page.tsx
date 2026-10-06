import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { CatalogBrowser } from '@/components/catalog-browser'
import { ShopShell } from '@/components/shop-shell'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { categoryHref, publicCategorySlug, resolveCategorySlug } from '@/lib/catalog'
import { categorySeo, pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { getCatalog, getPriceVisibility, listCatalogues } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const key = decodeURIComponent(slug[0] || '').trim()
  const canonical = resolveCategorySlug(key)
  const catalog = await getCatalog()
  const category = catalog.categories.find((item) => item.slug === canonical || publicCategorySlug(item.name) === canonical)
  if (!category) return { title: COMPANY.name, robots: { index: false, follow: true } }
  const seo = categorySeo(category.slug, category.name)
  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: categoryHref(category),
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const key = decodeURIComponent(slug[0] || '').trim()
  const canonical = resolveCategorySlug(key)
  if (!key) redirect(ROUTES.products)
  if (canonical === 'all') redirect(ROUTES.products)
  if (slug.length > 1 || canonical !== key) redirect(`/category/${canonical}`)
  const [catalog, showPrices, catalogues] = await Promise.all([getCatalog(), getPriceVisibility(), listCatalogues().catch(() => [])])
  const category = catalog.categories.find((item) => item.slug === canonical || publicCategorySlug(item.name) === canonical)
  if (!category) notFound()
  const products = catalog.products.filter((product) => publicCategorySlug(product.categoryName) === category.slug || product.categoryId === category.slug)
  const seo = categorySeo(category.slug, category.name)

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <ShopShell activeSlug={category.slug}>
        <section id="products" className="section">
          <Breadcrumbs
            items={[
              HOME_CRUMB,
              { name: 'Products', path: ROUTES.products },
              { name: category.name, path: categoryHref(category) },
            ]}
          />
          <span className="kicker">Category</span>
          <h1 className="page-title">{seo.h1}</h1>
          <p className="hero-lede">{seo.lede}</p>
          <h2 className="section-subhead">{seo.heading}</h2>
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
