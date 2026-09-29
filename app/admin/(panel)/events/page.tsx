import { AdminRecordsPanel } from '@/components/admin-records-panel'
import { listEvents } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const items = await listEvents(false).catch(() => [])
  return (
    <AdminRecordsPanel
      title="Events"
      itemLabel="event"
      endpoint="/api/admin/events"
      subtitle="Published events appear on /events."
      imageField="cover"
      items={items}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'location', label: 'Location' },
        { name: 'startAt', label: 'Date and time', type: 'datetime-local', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 6, required: true },
        { name: 'registrationUrl', label: 'Registration URL', type: 'url' },
        { name: 'cover', label: 'Cover image', type: 'file' },
        { name: 'published', label: 'Published', type: 'checkbox' },
      ]}
    />
  )
}
