'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { productHref, type SearchProduct } from '@/lib/catalog'
import type { SearchTrigger } from '@/lib/search-analytics'

const VISITOR_KEY = 'accord_vid'
const SESSION_KEY = 'accord_sid'

function matchingProducts(products: SearchProduct[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return products.filter((product) =>
    `${product.name} ${product.categoryName} ${product.manufacturer || ''} ${product.productType || ''} ${product.description || ''}`
      .toLowerCase()
      .includes(q),
  )
}

function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return ''
  }
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    return visitorId()
  }
}

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
  const queryRef = useRef('')
  const productsRef = useRef(products)
  const pathnameRef = useRef(pathname)
  const lastSent = useRef({ key: '', at: 0 })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  queryRef.current = query
  productsRef.current = products
  pathnameRef.current = pathname

  const allMatches = useMemo(() => matchingProducts(products, query), [products, query])
  const matches = allMatches.slice(0, 8)

  function sendSearch(trigger: SearchTrigger, productId = '') {
    const raw = queryRef.current.replace(/\s+/g, ' ').trim()
    if (raw.length < 2) return
    const catalog = productsRef.current
    const resultCount = matchingProducts(catalog, raw).length
    const key = `${raw.toLowerCase()}|${resultCount}|${catalog.length > 0 ? 'live' : 'error'}`
    const now = Date.now()
    if (trigger !== 'result' && trigger !== 'submit' && lastSent.current.key === key && now - lastSent.current.at < 5000) {
      return
    }
    lastSent.current = { key, at: now }
    const body = JSON.stringify({
      query: raw.slice(0, 120),
      resultCount,
      catalogReady: catalog.length > 0,
      trigger,
      path: pathnameRef.current || '/',
      visitorId: visitorId(),
      sessionId: sessionId(),
      productId,
    })
    void fetch('/api/analytics/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => null)
  }

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

  useEffect(() => {
    if (query.trim().length < 2) return
    const timer = window.setTimeout(() => sendSearch('idle'), 800)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function onPageHide() {
      sendSearch('pagehide')
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') sendSearch('pagehide')
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function goToResults() {
    sendSearch('submit')
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
          onBlur={() => sendSearch('blur')}
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
                sendSearch('result', product.id)
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
