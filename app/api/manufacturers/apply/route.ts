import { NextResponse } from 'next/server'
import { fail, formText, uploadFormDocument } from '@/lib/admin-form'
import { createManufacturer } from '@/lib/content-data'
import { isStoreConfigured } from '@/lib/mysql'
import { slugifyName } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json({ success: false, message: 'Applications are not available right now' }, { status: 503 })
  }
  const form = await request.formData()
  const companyName = formText(form, 'companyName')
  const email = formText(form, 'email')
  const contactName = formText(form, 'contactName')
  if (!companyName || !email || !contactName) return fail('Company name, contact name, and email are required')
  try {
    const brochure = await uploadFormDocument(form.get('brochure'), 'tarumed/manufacturers', slugifyName(companyName) || 'maker').catch(() => null)
    const item = await createManufacturer({
      companyName,
      contactName,
      email,
      phone: formText(form, 'phone'),
      website: formText(form, 'website'),
      productsOfInterest: formText(form, 'productsOfInterest'),
      notes: formText(form, 'notes'),
      brochure,
    })
    return NextResponse.json({ success: true, data: { token: item.token, status: item.status } })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not submit application', 500)
  }
}
