import { AdminCheckoutPanel } from '@/components/admin-checkout-panel'
import { getFullCatalog, listCheckoutOrders } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminCheckoutPage() {
  const [catalog, orders] = await Promise.all([
    getFullCatalog(),
    listCheckoutOrders().catch(() => []),
  ])
  return <AdminCheckoutPanel products={catalog.products} orders={orders} />
}
