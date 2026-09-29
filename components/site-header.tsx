import { SiteHeaderNav } from '@/components/site-header-nav'
import { getCatalog, siteJobCount } from '@/lib/site-data'
import { buildNavCategories } from '@/lib/catalog'

export async function SiteHeader() {
  const [catalog, jobCount] = await Promise.all([
    getCatalog(),
    siteJobCount().catch(() => 0),
  ])
  const products = catalog.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.categoryName,
    manufacturer: product.manufacturer,
    productType: product.productType,
  }))
  return <SiteHeaderNav categories={buildNavCategories(catalog, 5).filter((category) => category.slug !== 'uncategorized')} products={products} jobCount={jobCount} />
}
