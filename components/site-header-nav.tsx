'use client'

import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, Menu, ShoppingCart, X } from 'lucide-react'
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
  { href: ROUTES.contact, label: 'Contact', match: [ROUTES.contact] },
  { href: ROUTES.offers, label: 'Offers', match: [ROUTES.offers] },
  { href: ROUTES.events, label: 'Events', match: [ROUTES.events] },
  { href: ROUTES.manufacturers, label: 'Manufacturers', match: ['/manufacturers', '/manufacturer/'] },
]

const MEGA_PREVIEW = 5
const MEGA_CLOSE_DELAY = 140
const SCROLL_ON = 24
const SCROLL_OFF = 4

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
  const [megaOpen, setMegaOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { count } = useQuoteCart()

  const megaItemRef = useRef<HTMLDivElement>(null)
  const megaTriggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | null>(null)

  function closeMenu() {
    setOpen(false)
    setMobileCategory(null)
    setMegaOpen(false)
  }

  /* ---------- Mega menu (desktop) ---------- */
  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const openMega = useCallback(() => {
    clearCloseTimer()
    setMegaOpen(true)
  }, [clearCloseTimer])

  const scheduleCloseMega = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), MEGA_CLOSE_DELAY)
  }, [clearCloseTimer])

  function onMegaPointerEnter(event: PointerEvent) {
    if (event.pointerType === 'mouse') openMega()
  }

  function onMegaPointerLeave(event: PointerEvent) {
    if (event.pointerType === 'mouse') scheduleCloseMega()
  }

  function onMegaBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null
    if (!next || !event.currentTarget.contains(next)) setMegaOpen(false)
  }

  useEffect(() => {
    closeMenu()
  }, [pathname])

  useEffect(() => clearCloseTimer, [clearCloseTimer])

  useEffect(() => {
    if (!megaOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const focusInside = megaItemRef.current?.contains(document.activeElement)
      setMegaOpen(false)
      if (focusInside) megaTriggerRef.current?.focus()
    }
    function onPointerDown(event: globalThis.PointerEvent) {
      if (!megaItemRef.current?.contains(event.target as Node)) setMegaOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [megaOpen])

  /* ---------- Scroll state (hysteresis avoids flicker when height changes) ---------- */
  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const y = window.scrollY
      setScrolled((current) => (current ? y > SCROLL_OFF : y > SCROLL_ON))
    }
    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  /* ---------- Mobile drawer ---------- */
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

  const headerClass = ['site-header', open && 'menu-open', scrolled && 'is-scrolled', megaOpen && 'mega-open']
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClass}>
      <div className="header-bar">
        <div className="topline">
          <div className="shell flex items-center justify-between gap-4">
            <span>{COMPANY.tagline}</span>
            <span className="hidden sm:inline">Nairobi · {COMPANY.phone}</span>
          </div>
        </div>
        <div className="shell header-row">
          <Logo />
          <nav className="main-nav" aria-label="Main">
            {links.map((link) => {
              const active = isActive(pathname, link.match)
              const anchor = (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <NavLabel label={link.label} count={link.href === ROUTES.jobs ? jobCount : 0} />
                </Link>
              )

              if (link.href !== ROUTES.products) return anchor

              return (
                <div
                  key={link.href}
                  ref={megaItemRef}
                  className={megaOpen ? 'nav-item has-mega is-open' : 'nav-item has-mega'}
                  onPointerEnter={onMegaPointerEnter}
                  onPointerLeave={onMegaPointerLeave}
                  onBlur={onMegaBlur}
                >
                  <Link
                    href={link.href}
                    className={active ? 'active' : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <NavLabel label={link.label} />
                  </Link>
                  <button
                    ref={megaTriggerRef}
                    type="button"
                    className="mega-toggle"
                    aria-label={`${megaOpen ? 'Hide' : 'Show'} product categories`}
                    aria-expanded={megaOpen}
                    aria-controls="mega-menu"
                    onClick={() => (megaOpen ? setMegaOpen(false) : openMega())}
                  >
                    <ChevronDown size={14} />
                  </button>

                  <div id="mega-menu" className="mega" role="region" aria-label="Product categories" aria-hidden={!megaOpen}>
                    <div className="mega-panel">
                      <div className="mega-head">
                        <p>Product categories</p>
                        <Link href={ROUTES.products}>View all</Link>
                      </div>
                      <div className="mega-grid">
                        {categories.map((category) => {
                          const preview = category.products.slice(0, MEGA_PREVIEW)
                          return (
                            <div key={category.id} className="mega-col">
                              <Link href={categoryHref(category)} className="mega-title">
                                <span>{category.name}</span>
                                <span className="mega-count">{category.count}</span>
                              </Link>
                              <ul>
                                {preview.map((product) => (
                                  <li key={product.id}>
                                    <Link href={productHref(product)} className="mega-link">
                                      <span>{product.name}</span>
                                      <ArrowRight size={13} aria-hidden="true" />
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                              {category.count > preview.length ? (
                                <Link href={categoryHref(category)} className="mega-more">
                                  View all {category.count} products
                                </Link>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>
          <div className="header-actions">
            <div className="header-search">
              <SearchBox products={products} />
            </div>
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

      {/* Mobile drawer — unchanged */}
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