'use client'

import { useEffect } from 'react'

export function SiteToast({
  message,
  onDone,
}: {
  message: string
  onDone: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 5600)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  return (
    <div className="site-toast" role="status" aria-live="polite">
      <strong>Application received</strong>
      <span>{message}</span>
    </div>
  )
}
