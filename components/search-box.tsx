'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { productHref, type SearchProduct } from '@/lib/catalog'

export function SearchBox({
  products,
  onNavigate,
}: {
  products: SearchProduct[]
  onNavigate?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return []
    return products
      .filter((product) =>
        `${product.name} ${product.categoryName} ${product.manufacturer || ''} ${product.productType || ''} ${product.description || ''}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8)
  }, [products, query])

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (pathname !== '/products' || !dirty) return
    const q = query.trim()
    const timer = window.setTimeout(() => {
      const next = q ? `/products?q=${encodeURIComponent(q)}` : '/products'
      router.replace(next, { scroll: false })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [query, pathname, router, dirty])

  function goToResults() {
    const q = query.trim()
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    setOpen(false)
    onNavigate?.()
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    goToResults()
  }

  return (
    <div className="search-wrap" ref={wrapRef}>
      <form className="search" onSubmit={onSubmit} role="search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setDirty(true)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products"
          aria-label="Search products"
          aria-autocomplete="list"
          autoComplete="off"
        />
      </form>
      {open && query.trim() && (
        <div className="search-results" role="listbox">
          {matches.length === 0 && <p className="search-empty">No matching products</p>}
          {matches.map((product) => (
            <Link
              key={product.id}
              href={productHref(product)}
              className="search-result"
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
            >
              <strong>{product.name}</strong>
              <small>{product.categoryName}</small>
            </Link>
          ))}
          <button type="button" className="search-all" onClick={goToResults}>
            View all results
          </button>
        </div>
      )}
    </div>
  )
}
