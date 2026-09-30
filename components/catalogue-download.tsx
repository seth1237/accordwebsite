'use client'

import { useState } from 'react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function CatalogueDownloadLink({
  href,
  filename,
  className,
  children,
}: {
  href: string
  filename: string
  className?: string
  children: React.ReactNode
}) {
  const [active, setActive] = useState(false)

  function start(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (prefersReducedMotion()) {
      triggerDownload(href, filename)
      return
    }
    setActive(true)
    window.setTimeout(() => {
      triggerDownload(href, filename)
      setActive(false)
    }, 1100)
  }

  return (
    <>
      <a className={className} href={href} download={filename} onClick={start}>
        {children}
      </a>
      {active ? <CatalogueDownloadOverlay /> : null}
    </>
  )
}

export function CatalogueDownloadOverlay() {
  return (
    <div className="catalogue-dl-overlay" role="status" aria-live="polite">
      <div className="catalogue-dl-card">
        <div className="catalogue-dl-stage" aria-hidden="true">
          <span className="catalogue-dl-sheet">PDF</span>
          <span className="catalogue-dl-tray">
            <span className="catalogue-dl-bar" />
          </span>
        </div>
        <p>Downloading catalogue</p>
      </div>
    </div>
  )
}
