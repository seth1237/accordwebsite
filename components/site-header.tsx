import { SiteHeaderNav } from '@/components/site-header-nav'
import { getCatalog } from '@/lib/catalog-data'
import { buildNavCategories } from '@/lib/catalog'
import { listJobs } from '@/lib/mongodb'

export async function SiteHeader() {
  const [catalog, jobs] = await Promise.all([
    getCatalog(),
    listJobs(true).catch(() => []),
  ])
  const products = catalog.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.categoryName,
    manufacturer: product.manufacturer,
    productType: product.productType,
  }))
  return <SiteHeaderNav categories={buildNavCategories(catalog, 5).filter((category) => category.slug !== 'uncategorized')} products={products} jobCount={jobs.length} />
}
