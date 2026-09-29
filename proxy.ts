import { accordApiPath } from '@/lib/backend-url'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LIVE_PREFIXES = [
  '/products',
  '/product/',
  '/product-category',
  '/category',
  '/contact-us',
  '/get-in-touch',
  '/news',
  '/post',
  '/jobs',
  '/vacancy',
  '/quote',
  '/cart',
  '/customer-request',
  '/about-us',
  '/about.html',
  '/installations',
  '/projects',
  '/project',
  '/offers',
  '/events',
  '/manufacturers',
  '/manufacturer',
  '/admin',
  '/api',
]

const SKIP_LOOKUP_PREFIXES = [
  '/json',
  '/.well-known',
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/.git',
  '/cgi-bin',
]

function isLivePath(pathname: string) {
  if (pathname === '/' || pathname === '/product') return true
  return LIVE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix) && prefix.endsWith('/'))
}

function shouldLookup(pathname: string) {
  if (pathname.startsWith('/product-tag/')) return true
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) return false
  if (SKIP_LOOKUP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false
  return !isLivePath(pathname)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) return NextResponse.next()
  if (pathname === '/api/admin/catalog-import') return NextResponse.next()
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const session = request.cookies.get('tarumed_admin')?.value
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
      }
      const login = new URL('/admin/login', request.url)
      return NextResponse.redirect(login)
    }
  }

  if (shouldLookup(pathname)) {
    try {
      const lookup = new URL(accordApiPath('/api/redirects/lookup'))
      lookup.searchParams.set('from', pathname)
      const response = await fetch(lookup, {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(800),
      })
      if (response.ok) {
        const payload = await response.json() as { to?: string; status?: number }
        if (payload.to) {
          const destination = payload.to.startsWith('http') ? payload.to : new URL(payload.to, request.url)
          return NextResponse.redirect(destination, payload.status === 302 ? 302 : 301)
        }
      }
    } catch {
      // Keep serving the original path if lookup is unavailable.
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/((?!company-profile/pdf).*)',
    '/category/:path*',
    '/product-tag/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/|json(?:/|$)|.*\\.).*)',
  ],
}
