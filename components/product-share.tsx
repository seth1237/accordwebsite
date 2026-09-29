'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import type { CatalogProduct } from '@/lib/catalog'
import { COMPANY } from '@/lib/utils'

export function ProductShare({ product }: { product: CatalogProduct }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  function shareUrl() {
    if (typeof window === 'undefined') return `${COMPANY.url}/products/${product.slug}`
    return window.location.href
  }

  function shareText() {
    return `${product.name} from ${COMPANY.name}`
  }

  async function recordShare() {
    void fetch('/api/products/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
      }),
      keepalive: true,
    })
  }

  async function nativeShare() {
    const url = shareUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText(), url })
        await recordShare()
        setOpen(false)
        return
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return
      }
    }
    setOpen((current) => !current)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl())
    await recordShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function shareWhatsApp() {
    await recordShare()
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="share-wrap">
      <button type="button" className="button button-outline button-compact share-button" onClick={() => void nativeShare()}>
        <Share2 size={14} />
        Share
      </button>
      {open && (
        <div className="share-menu">
          <button type="button" onClick={() => void copyLink()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" onClick={() => void shareWhatsApp()}>WhatsApp</button>
        </div>
      )}
    </div>
  )
}
