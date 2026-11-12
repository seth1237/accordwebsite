'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analyticsVisitorId, endAnalyticsSession, trackAnalytics, trackPageView } from '@/lib/client-analytics'

export function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    const id = analyticsVisitorId()
    if (!id) return
    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: id, path: pathname }),
      keepalive: true,
    }).catch(() => null)
    trackPageView(pathname, typeof document === 'undefined' ? '' : document.title)
  }, [pathname])

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === 'hidden') endAnalyticsSession()
    }
    window.addEventListener('pagehide', endAnalyticsSession)
    document.addEventListener('visibilitychange', onHide)
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest?.('a')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('wa.me')) {
        trackAnalytics({ type: 'contact_click', path: href.slice(0, 180) })
      }
    }
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('pagehide', endAnalyticsSession)
      document.removeEventListener('visibilitychange', onHide)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}
