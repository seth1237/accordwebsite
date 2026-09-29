import { NextResponse } from 'next/server'
import { slugifyName } from '@/lib/catalog'
import { getCatalogueById, recordCatalogueDownload } from '@/lib/content-data'
import { isMysqlConfigured, mysqlGetCatalogueFile } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await getCatalogueById(id)
  if (!existing) return NextResponse.json({ success: false, message: 'Catalogue not found' }, { status: 404 })
  const url = new URL(request.url)
  await recordCatalogueDownload({
    catalogueId: id,
    productId: url.searchParams.get('productId') || existing.erpProductId,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '',
    referrer: request.headers.get('referer') || '',
  }).catch(() => null)

  const filename = `${slugifyName(existing.productName || existing.title) || 'catalogue'}.pdf`
  if (isMysqlConfigured()) {
    const file = await mysqlGetCatalogueFile(id)
    if (!file) return NextResponse.json({ success: false, message: 'Catalogue file is unavailable' }, { status: 404 })
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.mime || 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const remote = await fetch(existing.file.secureUrl)
  if (!remote.ok || !remote.body) {
    return NextResponse.json({ success: false, message: 'Catalogue file is unavailable' }, { status: 502 })
  }

  return new NextResponse(remote.body, {
    headers: {
      'Content-Type': remote.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
