import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { slugifyName } from '@/lib/catalog'
import { createCompanyProfilePage, listCompanyProfilePages } from '@/lib/content-data'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listCompanyProfilePages(false) })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const title = formText(form, 'title')
  if (!title) return fail('Title is required')
  try {
    const image = await uploadFormImage(form.get('image'), 'tarumed/profile', slugifyName(title) || 'profile')
    const item = await createCompanyProfilePage({
      title,
      body: formText(form, 'body'),
      image,
      order: Number(formText(form, 'order') || '0') || 0,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not save profile page', 500)
  }
}
