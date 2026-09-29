import { AdminRecordsPanel } from '@/components/admin-records-panel'
import { listOffers } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminOffersPage() {
  const items = await listOffers(false).catch(() => [])
  return (
    <AdminRecordsPanel
      title="Offers"
      itemLabel="offer"
      endpoint="/api/admin/offers"
      subtitle="Active published offers appear on /offers and the homepage banner."
      imageField="banner"
      items={items}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'discountText', label: 'Discount / price text' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 5 },
        { name: 'productIds', label: 'Linked product IDs' },
        { name: 'startDate', label: 'Start date', type: 'date', required: true },
        { name: 'endDate', label: 'End date', type: 'date', required: true },
        { name: 'banner', label: 'Banner image', type: 'file' },
        { name: 'published', label: 'Published', type: 'checkbox' },
      ]}
    />
  )
}
