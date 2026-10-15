import { AdminSearchReport } from '@/components/admin-search-report'
import { emptySearchReport } from '@/lib/search-analytics'
import { getSearchReport } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export default async function AdminSearchPage() {
  const report = await getSearchReport({ period: 'daily' }).catch(() => emptySearchReport('daily'))
  return <AdminSearchReport initial={report} />
}
