'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, BookOpen, Briefcase, Calendar, CreditCard, FileText, Heart, ImagePlus, LayoutDashboard, Link2, LogOut, MapPin, Package, Radio, Search, Settings, Share2, ShoppingCart, Store, Tag, Wrench } from 'lucide-react'

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/checkout', label: 'Checkout', icon: CreditCard },
  { href: '/admin/interest', label: 'Client interest', icon: Heart },
  { href: '/admin/images', label: 'Images', icon: ImagePlus },
  { href: '/admin/catalogues', label: 'Catalogues', icon: FileText },
  { href: '/admin/company-profile', label: 'Company profile', icon: BookOpen },
  { href: '/admin/installations', label: 'Installations', icon: Wrench },
  { href: '/admin/offers', label: 'Offers', icon: Tag },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/manufacturers', label: 'Manufacturers', icon: Store },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/performance', label: 'Performance', icon: BarChart3 },
  { href: '/admin/search', label: 'Search analytics', icon: Search },
  { href: '/admin/intelligence', label: 'Kenya Analytics', icon: MapPin, group: 'intel' },
  { href: '/admin/intelligence/compare', label: 'County comparison', icon: Share2, group: 'intel' },
  { href: '/admin/intelligence/products', label: 'Product engagement', icon: ShoppingCart, group: 'intel' },
  { href: '/admin/intelligence/traffic', label: 'Traffic sources', icon: Radio, group: 'intel' },
  { href: '/admin/redirects', label: 'Redirects', icon: Link2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-logo"><img src="/logo.png" alt="Accord" /></a>
        <div className="admin-label">Workspace</div>
        {nav.map((item, index) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : item.href === '/admin/intelligence'
              ? pathname === '/admin/intelligence' || Boolean(pathname?.startsWith('/admin/intelligence/counties'))
              : pathname.startsWith(item.href)
          const Icon = item.icon
          const showIntel = item.group === 'intel' && nav[index - 1]?.group !== 'intel'
          return (
            <Fragment key={item.href}>
              {showIntel ? <div className="admin-label">Customer Intelligence</div> : null}
              <Link href={item.href} className={active ? 'admin-nav active' : 'admin-nav'}>
                <Icon size={17} /> {item.label}
              </Link>
            </Fragment>
          )
        })}
        <div className="admin-sidebar-bottom">
          <p className="admin-user-email">{email}</p>
          <button className="admin-nav" onClick={logout}><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      <section className="admin-main">{children}</section>
    </main>
  )
}
