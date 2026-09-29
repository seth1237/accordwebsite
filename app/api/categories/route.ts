import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog-data'

export async function GET() {
  try {
    const catalog = await getCatalog()
    const data = catalog.categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      count: category.count,
    }))
    return NextResponse.json({ success: true, status: 'success', total: data.length, data })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Category fetch failed',
    }, { status: 502 })
  }
}
