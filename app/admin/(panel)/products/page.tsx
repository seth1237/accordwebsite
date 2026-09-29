import { AdminProductsPanel } from '@/components/admin-products-panel'
import { getCatalog } from '@/lib/catalog-data'
import { listCatalogues } from '@/lib/content-data'

export default async function AdminProductsPage() {
  const [catalog, catalogues] = await Promise.all([
    getCatalog(),
    listCatalogues().catch(() => []),
  ])
  return (
    <AdminProductsPanel
      products={catalog.products}
      categories={catalog.categories}
      catalogues={catalogues}
      title="Products"
      subtitle="Filter by category, then open a product to edit details, photos, and the machine catalogue PDF."
    />
  )
}
