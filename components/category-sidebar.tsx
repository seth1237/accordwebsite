'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { categoryHref, productHref, type NavCategory } from '@/lib/catalog'

export function CategorySidebar({
  categories,
  activeSlug,
}: {
  categories: NavCategory[]
  activeSlug?: string
}) {
  const pathname = usePathname()
  const currentSlug = pathname.startsWith('/category/')
    ? decodeURIComponent(pathname.slice('/category/'.length).split('/')[0] || '')
    : activeSlug
  const routeOpenId = categories.find((category) => category.slug === currentSlug)?.id ?? null
  const [openId, setOpenId] = useState<string | null>(routeOpenId)

  useEffect(() => {
    if (routeOpenId) setOpenId(routeOpenId)
  }, [routeOpenId])

  return (
    <aside className="category-sidebar" aria-label="Product categories">
      <p className="category-sidebar-label">Categories</p>
      <Link
        href="/products"
        className={pathname === '/products' ? 'category-sidebar-all active' : 'category-sidebar-all'}
      >
        All products
      </Link>
      {categories.map((category) => {
        const href = categoryHref(category)
        const expanded = openId === category.id
        const active = pathname === href || currentSlug === category.slug
        return (
          <div key={category.id} className={expanded ? 'category-sidebar-item open' : 'category-sidebar-item'}>
            <div className={active ? 'category-sidebar-row active' : 'category-sidebar-row'}>
              <Link
                href={href}
                className="category-sidebar-link"
                onClick={() => setOpenId(category.id)}
              >
                <span>{category.name}</span>
              </Link>
              <button
                type="button"
                className="category-sidebar-toggle"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Hide' : 'Show'} ${category.name} products`}
                onClick={() => setOpenId(expanded ? null : category.id)}
              >
                <ChevronDown size={16} className={expanded ? 'chevron open' : 'chevron'} />
              </button>
            </div>
            <div className="category-sidebar-panel">
              <div className="category-sidebar-panel-inner">
                {category.products.map((product) => (
                  <Link
                    key={product.id}
                    href={productHref(product)}
                    className={pathname === productHref(product) ? 'active' : undefined}
                  >
                    {product.name}
                  </Link>
                ))}
                <Link href={href} className="category-sidebar-viewall">
                  View all {category.count}
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </aside>
  )
}
