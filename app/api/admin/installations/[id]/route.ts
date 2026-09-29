import { NextResponse } from 'next/server'
import { deleteCloudinaryImage } from '@/lib/cloudinary'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { csvIds } from '@/lib/content'
import { deleteInstallation, getInstallationById, updateInstallation } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const existing = await getInstallationById(id)
  if (!existing) return fail('Installation not found', 404)
  const form = await request.formData()
  const title = formText(form, 'title') || existing.title
  let cover = existing.cover
  try {
    const uploaded = await uploadFormImage(form.get('cover'), 'tarumed/installations', slugifyName(title) || 'install')
    if (uploaded) {
      if (existing.cover?.publicId) await deleteCloudinaryImage(existing.cover.publicId).catch(() => undefined)
      cover = uploaded
    }
    if (formText(form, 'removeImage') === 'true') {
      if (cover?.publicId) await deleteCloudinaryImage(cover.publicId).catch(() => undefined)
      cover = null
    }
    const item = await updateInstallation(id, {
      title,
      slug: slugifyName(title) || existing.slug,
      facility: formText(form, 'facility'),
      location: formText(form, 'location'),
      body: formText(form, 'body') || existing.body,
      productIds: csvIds(formText(form, 'productIds')),
      categoryIds: csvIds(formText(form, 'categoryIds')),
      cover,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not update installation', 500)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const removed = await deleteInstallation(id)
  if (!removed) return fail('Installation not found', 404)
  if (removed.cover?.publicId) await deleteCloudinaryImage(removed.cover.publicId).catch(() => undefined)
  return NextResponse.json({ success: true })
}
