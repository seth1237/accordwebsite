import { NextResponse } from 'next/server'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { csvIds } from '@/lib/content'
import { createInstallation, listInstallations } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listInstallations(false) })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const title = formText(form, 'title')
  const body = formText(form, 'body')
  if (!title || !body) return fail('Title and details are required')
  try {
    const cover = await uploadFormImage(form.get('cover'), 'tarumed/installations', slugifyName(title) || 'install')
    const item = await createInstallation({
      title,
      facility: formText(form, 'facility'),
      location: formText(form, 'location'),
      body,
      productIds: csvIds(formText(form, 'productIds')),
      categoryIds: csvIds(formText(form, 'categoryIds')),
      cover,
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not create installation', 500)
  }
}
