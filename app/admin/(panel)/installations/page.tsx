import { AdminRecordsPanel } from '@/components/admin-records-panel'
import { listInstallations } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminInstallationsPage() {
  const items = await listInstallations(false).catch(() => [])
  return (
    <AdminRecordsPanel
      title="Installations"
      itemLabel="installation"
      endpoint="/api/admin/installations"
      subtitle="Published installations appear on /projects, with each case study at /project/{slug}."
      imageField="cover"
      items={items}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'facility', label: 'Facility' },
        { name: 'location', label: 'Location' },
        { name: 'body', label: 'Narrative', type: 'textarea', rows: 8, required: true },
        { name: 'productIds', label: 'Linked product IDs', placeholder: 'Comma-separated ERP IDs' },
        { name: 'cover', label: 'Cover image', type: 'file' },
        { name: 'published', label: 'Published', type: 'checkbox' },
      ]}
    />
  )
}
