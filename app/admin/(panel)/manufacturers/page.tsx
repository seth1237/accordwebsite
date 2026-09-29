import { AdminManufacturersPanel } from '@/components/admin-manufacturers-panel'
import { listManufacturers } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminManufacturersPage() {
  const items = await listManufacturers().catch(() => [])
  return <AdminManufacturersPanel items={items} />
}
