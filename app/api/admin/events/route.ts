import { NextResponse } from 'next/server'
import { fail, formChecked, formText, requireAdminApi, uploadFormImage } from '@/lib/admin-form'
import { createEvent, listEvents } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  return NextResponse.json({ success: true, data: await listEvents(false) })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const title = formText(form, 'title')
  if (!title) return fail('Title is required')
  try {
    const cover = await uploadFormImage(form.get('cover'), 'tarumed/events', slugifyName(title) || 'event')
    const item = await createEvent({
      title,
      description: formText(form, 'description'),
      startAt: formText(form, 'startAt') || new Date().toISOString(),
      location: formText(form, 'location'),
      cover,
      registrationUrl: formText(form, 'registrationUrl'),
      published: formChecked(form, 'published'),
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not create event', 500)
  }
}
