import { NextResponse } from 'next/server'
import { resolveRedirect } from '@/lib/content-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const from = new URL(request.url).searchParams.get('from') || ''
  const match = await resolveRedirect(from).catch(() => null)
  if (!match) return NextResponse.json({ success: false }, { status: 404 })
  return NextResponse.json({ success: true, to: match.to, status: match.status })
}
