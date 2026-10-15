import { AdminCatalogCreate } from '@/components/admin-catalog-create'
import { AdminCatalogCsv } from '@/components/admin-catalog-csv'
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
      <AdminCatalogCsv />
      <AdminCatalogImport />
      <AdminCatalogCreate categories={catalog.categories} />
      <AdminProductsPanel
        products={catalog.products}
        categories={catalog.categories}
        catalogues={catalogues}
        title="Products"
        subtitle="Drop photos onto a product, or open it to edit details, enable checkout for priced products, hide it, or delete it."
      />
    </>
  )
}
