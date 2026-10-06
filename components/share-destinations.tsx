'use client'

import { shareFacebookUrl, shareLinkedInUrl, shareWhatsAppUrl, shareXUrl } from '@/lib/socials'

export function ShareDestinations({
  url,
  text,
  onShare,
}: {
  url: string
  text: string
  onShare?: () => void | Promise<void>
}) {
  async function open(href: string) {
    await onShare?.()
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <button type="button" onClick={() => void open(shareWhatsAppUrl(url, text))}>WhatsApp</button>
      <button type="button" onClick={() => void open(shareFacebookUrl(url))}>Facebook</button>
      <button type="button" onClick={() => void open(shareXUrl(url, text))}>X</button>
      <button type="button" onClick={() => void open(shareLinkedInUrl(url))}>LinkedIn</button>
    </>
  )
}
