import { AdminJobsPanel } from '@/components/admin-jobs-panel'
import { listJobApplications, listJobs } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminJobsPage() {
  const [jobs, applications] = await Promise.all([
    listJobs(false).catch(() => []),
    listJobApplications().catch(() => []),
  ])
  return <AdminJobsPanel jobs={jobs} applications={applications} />
}
