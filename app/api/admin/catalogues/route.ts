import { NextResponse } from 'next/server'
import { fail, formText, requireAdminApi, uploadFormDocument } from '@/lib/admin-form'
import { getCatalog } from '@/lib/catalog-data'
import { catalogueAnalytics, createCatalogue, listCatalogues } from '@/lib/content-data'
import { slugifyName } from '@/lib/catalog'
import { isMysqlConfigured } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const analytics = await catalogueAnalytics()
  return NextResponse.json({ success: true, data: analytics })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error
  const form = await request.formData()
  const title = formText(form, 'title')
  const erpProductId = formText(form, 'erpProductId')
  if (!title || !erpProductId) return fail('Title and product ID are required')
  try {
    const catalog = await getCatalog()
    const product = catalog.products.find((item) => item.id === erpProductId)
    const upload = form.get('file')
    if (!(upload instanceof File) || upload.size <= 0) return fail('Upload a PDF catalogue')
    if (upload.size > 20 * 1024 * 1024) return fail('Upload a PDF under 20MB')
    const isPdf = upload.type === 'application/pdf' || upload.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) return fail('Upload a PDF catalogue')
    const item = isMysqlConfigured()
      ? await createCatalogue({
          title,
          erpProductId,
          categoryId: product?.categoryId || '',
          productName: product?.name || '',
          file: { publicId: '', secureUrl: '' },
          fileBytes: Buffer.from(await upload.arrayBuffer()),
          filename: upload.name || 'catalogue.pdf',
          mime: upload.type || 'application/pdf',
        })
      : await createCatalogue({
          title,
          erpProductId,
          categoryId: product?.categoryId || '',
          productName: product?.name || '',
          file: await uploadFormDocument(upload, 'tarumed/catalogues', slugifyName(title) || 'catalogue').then((file) => {
            if (!file) throw new Error('Upload a PDF catalogue')
            return file
          }),
        })
    return NextResponse.json({ success: true, data: item, catalogues: await listCatalogues() })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not save catalogue', 500)
  }
}
