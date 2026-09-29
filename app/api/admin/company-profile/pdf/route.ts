import { NextResponse } from 'next/server'
import { fail, requireAdminApi } from '@/lib/admin-form'
import { replaceCompanyProfileFromPdf } from '@/lib/content-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_PDF_BYTES = 45 * 1024 * 1024

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    console.error('Company profile PDF form parse failed', error)
    return fail('That PDF is too large to read. Upload a file under 45MB.', 413)
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size <= 0) return fail('Upload a PDF company profile')
  if (file.size > MAX_PDF_BYTES) return fail('Upload a PDF under 45MB')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return fail('Upload a PDF company profile')
  try {
    const pages = await replaceCompanyProfileFromPdf(Buffer.from(await file.arrayBuffer()), file.name || 'profile.pdf')
    return NextResponse.json({ success: true, count: pages.length, data: pages })
  } catch (error) {
    console.error('Company profile PDF convert failed', error)
    return fail(error instanceof Error ? error.message : 'Could not convert that PDF', 500)
  }
}
