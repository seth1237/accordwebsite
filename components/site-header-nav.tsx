'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, ShoppingCart, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SearchBox } from '@/components/search-box'
import { useQuoteCart } from '@/components/quote-cart'
import { COMPANY } from '@/lib/utils'
import { productHref, categoryHref, type NavCategory, type SearchProduct } from '@/lib/catalog'
import { ROUTES } from '@/lib/routes'

const links = [
  { href: ROUTES.products, label: 'Products', match: ['/products', '/product/', '/category/'] },
  { href: ROUTES.about, label: 'About', match: [ROUTES.about] },
  { href: ROUTES.projects, label: 'Projects', match: ['/projects', '/project/'] },
  { href: ROUTES.jobs, label: 'Careers', match: ['/jobs', '/vacancy/'] },
  { href: ROUTES.news, label: 'News', match: ['/news', '/post/'] },
  { href: ROUTES.contact, label: 'Contact', match: [ROUTES.contact] },
  { href: ROUTES.offers, label: 'Offers', match: [ROUTES.offers] },
  { href: ROUTES.events, label: 'Events', match: [ROUTES.events] },
  { href: ROUTES.manufacturers, label: 'Manufacturers', match: ['/manufacturers', '/manufacturer/'] },
]

function isActive(pathname: string, match: string[]) {
  return match.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}

function NavLabel({ label, count }: { label: string; count?: number }) {
  return (
    <span className="nav-label">
      {label}
      {count ? <span className="nav-count" aria-label={`${count} open ${count === 1 ? 'role' : 'roles'}`}>{count}</span> : null}
    </span>
  )
}

export function SiteHeaderNav({
  categories,
  products,
  jobCount = 0,
}: {
  categories: NavCategory[]
  products: SearchProduct[]
  jobCount?: number
}) {
  const [open, setOpen] = useState(false)
  const [mobileCategory, setMobileCategory] = useState<string | null>(null)
  const pathname = usePathname()
  const { count } = useQuoteCart()

  function closeMenu() {
    setOpen(false)
    setMobileCategory(null)
  }

  useEffect(() => {
    closeMenu()
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className={open ? 'site-header menu-open' : 'site-header'}>
      <div className="header-bar">
        <div className="topline">
          <div className="shell flex items-center justify-between gap-4">
            <span>{COMPANY.tagline}</span>
            <span className="hidden sm:inline">Nairobi · {COMPANY.phone}</span>
          </div>
        </div>
        <div className="shell header-row">
          <Logo />
          <nav className="main-nav">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(pathname, link.match) ? 'active' : undefined}>
                <NavLabel label={link.label} count={link.href === ROUTES.jobs ? jobCount : 0} />
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <SearchBox products={products} />
            <Link href={ROUTES.quote} className="header-quote-link text-link">Request Quote</Link>
            <Link href={ROUTES.cart} className="cart-link" aria-label={`Quote cart, ${count} items`}>
              <ShoppingCart size={18} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </div>
          <button
            type="button"
            className="mobile-trigger"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className={open ? 'mobile-drawer is-open' : 'mobile-drawer'} id="mobile-menu" aria-hidden={!open}>
        <button type="button" className="mobile-backdrop" aria-label="Close menu" onClick={closeMenu} />
        <div className="mobile-panel" role="dialog" aria-modal={open} aria-label="Site menu">
          <div className="mobile-panel-scroll">
            <nav className="mobile-nav-links">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className={isActive(pathname, link.match) ? 'active' : undefined}>
                  <NavLabel label={link.label} count={link.href === ROUTES.jobs ? jobCount : 0} />
                </Link>
              ))}
            </nav>
            <div className="mobile-menu-actions">
              <Link href={ROUTES.quote} className="button button-primary" onClick={closeMenu}>Request Quote</Link>
              <Link href={ROUTES.cart} className="button button-outline mobile-cart-btn" onClick={closeMenu}>
                Quote cart{count > 0 ? ` (${count})` : ''}
              </Link>
            </div>
            <div className="mobile-categories">
              <div className="mobile-categories-head">
                <p>Product categories</p>
                <Link href={ROUTES.products} onClick={closeMenu}>View all</Link>
              </div>
              {categories.map((category) => {
                const expanded = mobileCategory === category.id
                const preview = category.products.slice(0, 6)
                return (
                  <div key={category.id} className={expanded ? 'mobile-category open' : 'mobile-category'}>
                    <div className="mobile-category-row">
                      <Link href={categoryHref(category)} onClick={closeMenu}>{category.name}</Link>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${category.name} products`}
                        onClick={() => setMobileCategory(expanded ? null : category.id)}
                      >
                        <ChevronDown size={16} className={expanded ? 'chevron open' : 'chevron'} />
                      </button>
                    </div>
                    {expanded ? (
                      <div className="mobile-products">
                        {preview.map((product) => (
                          <Link key={product.id} href={productHref(product)} onClick={closeMenu}>{product.name}</Link>
                        ))}
                        <Link href={categoryHref(category)} onClick={closeMenu} className="mobile-view-all">
                          View all {category.count} products
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
