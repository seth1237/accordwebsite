import { NextResponse } from 'next/server'
import { recordProductClick } from '@/lib/mongodb'

function text(value: unknown, max = 200) {
  return String(value || '').trim().slice(0, max)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const erpProductId = text(body.productId || body.erpProductId, 80)
    if (!erpProductId) {
      return NextResponse.json({ success: false, message: 'productId is required' }, { status: 400 })
    }

    await recordProductClick({
      erpProductId,
      productName: text(body.productName, 200),
      categoryId: text(body.categoryId, 80),
      categoryName: text(body.categoryName, 200),
      fromProductId: text(body.fromProductId, 80) || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Could not record click',
    }, { status: 500 })
  }
}
