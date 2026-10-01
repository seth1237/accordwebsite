import { AdminEventsPanel } from '@/components/admin-events-panel'
import { listEvents } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const items = await listEvents(false).catch(() => [])
  return <AdminEventsPanel items={items} />
}
