import { AdminCataloguesPanel } from '@/components/admin-catalogues-panel'
import { catalogueAnalytics, getCatalog } from '@/lib/site-data'

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
      products={catalog.products || []}
    />
  )
}
