import { AdminOffersPanel } from '@/components/admin-offers-panel'
import { getFullCatalog, getOfferAnalytics, listOffers } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminOffersPage() {
  const [offers, catalog, stats] = await Promise.all([
    listOffers(false).catch(() => []),
    getFullCatalog().catch(() => ({ products: [], categories: [] })),
    getOfferAnalytics().catch(() => ({ clicks: 0, whatsapp: 0, products: [], events: [] })),
  ])
  return <AdminOffersPanel offers={offers} products={catalog.products} stats={stats} />
}
