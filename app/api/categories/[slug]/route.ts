import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog-data'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const catalog = await getCatalog()
    const category = catalog.categories.find((item) => item.slug === slug)
    const products = catalog.products.filter((product) => product.categoryId === slug)
    if (!category && !products.length) {
      return NextResponse.json({ success: false, status: 'error', message: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      status: 'success',
      name: category?.name || products[0]?.categoryName || slug,
      slug,
      count: products.length,
      data: products,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Category fetch failed',
    }, { status: 502 })
  }
}
