'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { jobHref, type JobPost } from '@/lib/jobs'
import { COMPANY } from '@/lib/utils'

export function JobShare({ job }: { job: Pick<JobPost, 'title' | 'slug' | 'location'> }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  function shareUrl() {
    return `${COMPANY.url}${jobHref(job)}`
  }

  function shareText() {
    return `${job.title} at ${COMPANY.name}${job.location ? ` — ${job.location}` : ''}`
  }

  async function nativeShare() {
    const url = shareUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text: shareText(), url })
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

  function shareWhatsApp() {
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
          <button type="button" onClick={shareWhatsApp}>WhatsApp</button>
        </div>
      )}
    </div>
  )
}
