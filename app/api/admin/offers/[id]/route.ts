import { NextResponse } from 'next/server'
import { deleteCloudinaryImage } from '@/lib/cloudinary'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { csvIds } from '@/lib/content'
import { deleteOffer, getOfferById, updateOffer } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const existing = await getOfferById(id)
  if (!existing) return fail('Offer not found', 404)
  const form = await request.formData()
  const title = formText(form, 'title') || existing.title
  let banner = existing.banner
  try {
    const uploaded = await uploadFormImage(form.get('banner'), 'tarumed/offers', slugifyName(title) || 'offer')
    if (uploaded) {
      if (existing.banner?.publicId) await deleteCloudinaryImage(existing.banner.publicId).catch(() => undefined)
      banner = uploaded
    }
    if (formText(form, 'removeImage') === 'true') {
      if (banner?.publicId) await deleteCloudinaryImage(banner.publicId).catch(() => undefined)
      banner = null
    }
    const item = await updateOffer(id, {
      title,
      description: formText(form, 'description'),
      discountText: formText(form, 'discountText'),
      productIds: csvIds(formText(form, 'productIds')),
      startDate: formText(form, 'startDate') || existing.startDate,
      endDate: formText(form, 'endDate') || existing.endDate,
      banner,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not update offer', 500)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const removed = await deleteOffer(id)
  if (!removed) return fail('Offer not found', 404)
  if (removed.banner?.publicId) await deleteCloudinaryImage(removed.banner.publicId).catch(() => undefined)
  return NextResponse.json({ success: true })
}
