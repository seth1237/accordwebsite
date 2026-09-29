import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { getSiteSettings, updateSiteSettings } from '@/lib/mongodb'
import { isStoreConfigured } from '@/lib/mysql'

const schema = z.object({ showPrices: z.boolean() })

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })
  try {
    const body = schema.parse(await request.json())
    const settings = await updateSiteSettings({ showPrices: body.showPrices })
    return NextResponse.json({ success: true, showPrices: settings.showPrices })
  } catch {
    return NextResponse.json({ success: false, message: 'Could not update settings' }, { status: 400 })
  }
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  const settings = await getSiteSettings()
  return NextResponse.json({ success: true, showPrices: settings.showPrices })
}
