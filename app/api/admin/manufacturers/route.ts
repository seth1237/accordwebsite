import { NextResponse } from 'next/server'
import { fail, formText, requireAdminApi } from '@/lib/admin-form'
import { listManufacturers, updateManufacturer } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listManufacturers() })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const id = formText(form, 'id')
  const status = formText(form, 'status')
  if (!id || !['approved', 'rejected', 'pending'].includes(status)) return fail('Valid id and status are required')
  const item = await updateManufacturer(id, { status: status as 'approved' | 'rejected' | 'pending', adminNote: formText(form, 'adminNote') })
  if (!item) return fail('Submission not found', 404)
  return NextResponse.json({ success: true, data: item })
}
