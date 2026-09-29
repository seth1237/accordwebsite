import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { catalogImportStatus, importCatalogBatch } from '@/lib/catalog-import'
import { isMysqlConfigured } from '@/lib/mysql'

export const maxDuration = 120

async function authorize(request: Request) {
  const session = await getAdminSession()
  if (session) return true
  const key = request.headers.get('x-import-key') || ''
  const expected = process.env.CATALOG_IMPORT_KEY || process.env.ADMIN_SESSION_SECRET || ''
  return Boolean(expected) && key === expected
}

export async function GET(request: Request) {
  if (!(await authorize(request))) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isMysqlConfigured()) return NextResponse.json({ success: false, message: 'MySQL is not configured' }, { status: 503 })
  const data = await catalogImportStatus()
  return NextResponse.json({ success: true, data })
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isMysqlConfigured()) return NextResponse.json({ success: false, message: 'MySQL is not configured' }, { status: 503 })
  const body = await request.json().catch(() => ({})) as { limit?: number }
  const limit = Math.max(1, Math.min(20, Number(body.limit) || 6))
  try {
    const data = await importCatalogBatch(limit)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Catalog import failed',
    }, { status: 502 })
  }
}
