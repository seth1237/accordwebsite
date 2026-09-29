import { AdminCataloguesPanel } from '@/components/admin-catalogues-panel'
import { getCatalog } from '@/lib/catalog-data'
import { catalogueAnalytics } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export default async function AdminCataloguesPage() {
  const [analytics, catalog] = await Promise.all([
    catalogueAnalytics().catch(() => ({ total: 0, catalogues: [], recent: [] })),
    getCatalog(),
  ])
  return (
    <AdminCataloguesPanel
      catalogues={analytics.catalogues}
      total={analytics.total}
      products={catalog.products}
    />
  )
}
