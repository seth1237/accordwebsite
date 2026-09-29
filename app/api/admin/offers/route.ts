import { NextResponse } from 'next/server'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { csvIds } from '@/lib/content'
import { createOffer, listOffers } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listOffers(false) })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const title = formText(form, 'title')
  if (!title) return fail('Title is required')
  try {
    const banner = await uploadFormImage(form.get('banner'), 'tarumed/offers', slugifyName(title) || 'offer')
    const item = await createOffer({
      title,
      description: formText(form, 'description'),
      discountText: formText(form, 'discountText'),
      productIds: csvIds(formText(form, 'productIds')),
      startDate: formText(form, 'startDate') || new Date().toISOString(),
      endDate: formText(form, 'endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      banner,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not create offer', 500)
  }
}
