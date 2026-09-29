import { AdminRecordsPanel } from '@/components/admin-records-panel'
import { listRedirects } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminRedirectsPage() {
  const items = await listRedirects().catch(() => [])
  return (
    <AdminRecordsPanel
      title="Redirects"
      itemLabel="redirect"
      endpoint="/api/admin/redirects"
      subtitle="Legacy paths 301 to the current site without a deploy. /shop, /contact, and /blog are already in next.config."
      items={items.map((item) => ({ ...item, title: `${item.from} → ${item.to}` }))}
      fields={[
        { name: 'from', label: 'From path', required: true, placeholder: '/old-path' },
        { name: 'to', label: 'To path', required: true, placeholder: '/category/cold-chain' },
        { name: 'status', label: 'Status', placeholder: '301' },
      ]}
    />
  )
}
