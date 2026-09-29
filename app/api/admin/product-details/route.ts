import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { updateProductDetails } from '@/lib/mongodb'
import { isStoreConfigured } from '@/lib/mysql'

const schema = z.object({
  erpProductId: z.string().min(1),
  details: z.string().max(8000),
  distributedFor: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })
  try {
    const body = schema.parse(await request.json())
    const data = await updateProductDetails(body.erpProductId, body.details.trim(), {
      distributedFor: body.distributedFor?.trim() || '',
    })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, message: 'Could not save product details' }, { status: 400 })
  }
}
