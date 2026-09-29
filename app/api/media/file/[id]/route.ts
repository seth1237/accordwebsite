import { NextResponse } from 'next/server'
import { mysqlGetFile } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await mysqlGetFile(id)
  if (!file) return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 })
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.mime || 'application/octet-stream',
      'Content-Length': String(file.data.length),
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
