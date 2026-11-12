import { Suspense } from 'react'
import { KenyaIntelCounty } from '@/components/kenya-intel-county'

export default async function KenyaCountyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return (
    <Suspense fallback={<p className="empty-state">Loading county…</p>}>
      <KenyaIntelCounty code={code} />
    </Suspense>
  )
}
