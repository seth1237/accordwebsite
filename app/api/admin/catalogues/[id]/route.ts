import { NextResponse } from 'next/server'
import { deleteCloudinaryImage } from '@/lib/cloudinary'
import { fail, requireAdminApi } from '@/lib/admin-form'
import { deleteCatalogue } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const removed = await deleteCatalogue(id)
  if (!removed) return fail('Catalogue not found', 404)
  if (removed.file?.publicId) await deleteCloudinaryImage(removed.file.publicId, 'raw').catch(() => undefined)
  return NextResponse.json({ success: true })
}
