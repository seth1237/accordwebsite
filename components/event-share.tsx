'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { ShareDestinations } from '@/components/share-destinations'
import { eventHref, type EventPost } from '@/lib/content'
import { COMPANY } from '@/lib/utils'

type ShareEvent = Pick<EventPost, 'title' | 'slug' | 'location'>

export function EventShare({ item }: { item: ShareEvent }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  function shareUrl() {
    return `${COMPANY.url}${eventHref(item)}`
  }

  function shareText() {
    return `${item.title}${item.location ? ` — ${item.location}` : ''} | ${COMPANY.name}`
  }

  async function posterFile() {
    try {
      const response = await fetch(`/events/${item.slug}/opengraph-image`)
      if (!response.ok) return null
      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) return null
      return new File([blob], `${item.slug || 'event'}-poster.jpg`, { type: blob.type || 'image/jpeg' })
    } catch {
      return null
    }
  }

  async function nativeShare() {
    const url = shareUrl()
    const title = item.title
    const text = shareText()
    if (navigator.share) {
      try {
        const file = await posterFile()
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, text, url, files: [file] })
        } else {
          await navigator.share({ title, text, url })
        }
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
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
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
          <ShareDestinations url={shareUrl()} text={shareText()} />
        </div>
      )}
    </div>
  )
}
