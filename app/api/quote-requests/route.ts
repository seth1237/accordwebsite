import { NextResponse } from 'next/server'
import { createERPQuote } from '@/lib/erp'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.clientName || !body.clientNumber || !body.clientLocation || !Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({
        success: false,
        message: 'clientName, clientNumber, clientLocation and items are required',
      }, { status: 400 })
    }
    for (const item of body.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000 || typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return NextResponse.json({ success: false, message: 'Invalid quote item' }, { status: 400 })
      }
    }
    return NextResponse.json(await createERPQuote(body))
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Quote request failed',
    }, { status: 502 })
  }
}
