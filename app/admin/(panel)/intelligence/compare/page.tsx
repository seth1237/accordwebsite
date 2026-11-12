import { Suspense } from 'react'
import { KenyaIntelCompare } from '@/components/kenya-intel-compare'

export default function KenyaComparePage() {
  return (
    <Suspense fallback={<p className="empty-state">Loading comparison…</p>}>
      <KenyaIntelCompare />
    </Suspense>
  )
}
