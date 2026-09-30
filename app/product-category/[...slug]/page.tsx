import { redirect } from 'next/navigation'
import { resolveCategorySlug } from '@/lib/catalog'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export default async function LegacyCategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const first = resolveCategorySlug(decodeURIComponent(slug[0] || '').trim())
  if (!first || first === 'all') redirect(ROUTES.products)
  redirect(`/category/${first}`)
}
