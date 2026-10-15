import { AdminClientInterestPanel } from '@/components/admin-client-interest-panel'
import { listClientInterestBoard } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminClientInterestPage() {
  const rows = await listClientInterestBoard().catch(() => [])
  return <AdminClientInterestPanel rows={rows} />
}
