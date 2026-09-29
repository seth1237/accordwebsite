import { NextResponse } from 'next/server'
import { fail, formText, requireAdminApi } from '@/lib/admin-form'
import { createRedirect, listRedirects } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listRedirects() })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const from = formText(form, 'from')
  const to = formText(form, 'to')
  if (!from || !to) return fail('From and to paths are required')
  try {
    const item = await createRedirect({ from, to, status: Number(formText(form, 'status') || 301) })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not save redirect', 500)
  }
}
