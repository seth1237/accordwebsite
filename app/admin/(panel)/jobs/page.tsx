import { AdminJobsPanel } from '@/components/admin-jobs-panel'
import { listJobs } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export default async function AdminJobsPage() {
  const jobs = await listJobs(false).catch(() => [])
  return <AdminJobsPanel jobs={jobs} />
}
