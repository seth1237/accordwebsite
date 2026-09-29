import { NextResponse } from 'next/server'
import { getManufacturerByToken } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const item = await getManufacturerByToken(token)
  if (!item) return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 })
  return NextResponse.json({
    success: true,
    data: {
      companyName: item.companyName,
      status: item.status,
      adminNote: item.adminNote,
      createdAt: item.createdAt,
    },
  })
}
