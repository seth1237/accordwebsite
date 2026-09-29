import { NextResponse } from 'next/server'
import { deleteCloudinaryImage } from '@/lib/cloudinary'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { deleteCompanyProfilePage, getCompanyProfilePageById, updateCompanyProfilePage } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'
import { mysqlDeleteFile } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

async function removeStoredImage(publicId?: string | null) {
  if (!publicId) return
  if (publicId.startsWith('mysql:')) await mysqlDeleteFile(publicId).catch(() => undefined)
  else await deleteCloudinaryImage(publicId).catch(() => undefined)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const existing = await getCompanyProfilePageById(id)
  if (!existing) return fail('Profile page not found', 404)
  const form = await request.formData()
  const title = formText(form, 'title') || existing.title
  let image = existing.image
  try {
    const uploaded = await uploadFormImage(form.get('image'), 'tarumed/profile', slugifyName(title) || 'profile')
    if (uploaded) {
      await removeStoredImage(existing.image?.publicId)
      image = uploaded
    }
    if (formText(form, 'removeImage') === 'true') {
      await removeStoredImage(image?.publicId)
      image = null
    }
    const item = await updateCompanyProfilePage(id, {
      title,
      body: formText(form, 'body'),
      image,
      order: Number(formText(form, 'order') || String(existing.order)) || existing.order,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not update profile page', 500)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const removed = await deleteCompanyProfilePage(id)
  if (!removed) return fail('Profile page not found', 404)
  if (removed.image?.publicId) await removeStoredImage(removed.image.publicId)
  return NextResponse.json({ success: true })
}
