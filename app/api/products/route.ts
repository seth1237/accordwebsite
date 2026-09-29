import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog-data'

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('category') || new URL(request.url).searchParams.get('categoryIds')
  const categoryIds = slug?.split(',').filter(Boolean)
  try {
    const catalog = await getCatalog(categoryIds)
    return NextResponse.json({
      success: true,
      status: 'success',
      total: catalog.products.length,
      data: catalog.products,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Product fetch failed',
    }, { status: 502 })
  }
}
