import { NextResponse } from 'next/server'
import { getCatalogProduct } from '@/lib/catalog-data'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const product = await getCatalogProduct(slug)
    if (!product) {
      return NextResponse.json({ success: false, status: 'error', message: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, status: 'success', data: product })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Product fetch failed',
    }, { status: 502 })
  }
}
