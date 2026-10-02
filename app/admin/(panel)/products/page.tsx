import { AdminCatalogCreate } from '@/components/admin-catalog-create'
import { AdminCatalogImport } from '@/components/admin-catalog-import'
import { AdminProductsPanel } from '@/components/admin-products-panel'
import { getFullCatalog, listCatalogues } from '@/lib/site-data'

export default async function AdminProductsPage() {
  const [catalog, catalogues] = await Promise.all([
    getFullCatalog(),
    listCatalogues().catch(() => []),
  ])
  return (
    <>
      <AdminCatalogImport />
      <AdminCatalogCreate categories={catalog.categories} />
      <AdminProductsPanel
        products={catalog.products}
        categories={catalog.categories}
        catalogues={catalogues}
        title="Products"
        subtitle="Filter by category, then open a product to edit details, photos, and the machine catalogue PDF."
      />
    </>
  )
}
