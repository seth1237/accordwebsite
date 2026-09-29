import { NextResponse } from 'next/server'
import { fail, formText, requireAdminApi } from '@/lib/admin-form'
import { deleteRedirect, getRedirectById, updateRedirect } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const existing = await getRedirectById(id)
  if (!existing) return fail('Redirect not found', 404)
  const form = await request.formData()
  const item = await updateRedirect(id, {
    from: formText(form, 'from') || existing.from,
    to: formText(form, 'to') || existing.to,
    status: Number(formText(form, 'status') || existing.status),
  })
  return NextResponse.json({ success: true, data: item })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const { id } = await params
  const removed = await deleteRedirect(id)
  if (!removed) return fail('Redirect not found', 404)
  return NextResponse.json({ success: true })
}
