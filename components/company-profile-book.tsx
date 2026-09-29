'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CompanyProfilePage } from '@/lib/content'

const FLIP_MS = 1180

function paragraphs(body: string) {
  return body.split(/\n+/).map((item) => item.trim()).filter(Boolean)
}

function isPrintPage(page?: CompanyProfilePage) {
  return Boolean(page?.image?.secureUrl) && !String(page?.body || '').trim()
}

function Sheet({
  page,
  side,
  cover = false,
}: {
  page?: CompanyProfilePage
  side: 'left' | 'right' | 'single'
  cover?: boolean
}) {
  if (!page) {
    return <div className={`profile-sheet ${side} is-blank`} aria-hidden="true" />
  }
  const printPage = isPrintPage(page)
  return (
    <article className={`profile-sheet ${side}${cover && !printPage ? ' is-cover' : ''}${printPage ? ' is-print' : ''}`}>
      {page.image?.secureUrl ? (
        <img src={page.image.secureUrl} alt={page.title || ''} />
      ) : null}
      {!printPage && page.title ? <h3>{page.title}</h3> : null}
      {!printPage && paragraphs(page.body).map((item, index) => (
        <p key={`${page._id}-${index}`}>{item}</p>
      ))}
      {!printPage && page.order > 0 && <span className="profile-folio">{page.order}</span>}
    </article>
  )
}

export function CompanyProfileBook({ pages }: { pages: CompanyProfilePage[] }) {
  const [index, setIndex] = useState(0)
  const [spread, setSpread] = useState(true)
  const [pageRatio, setPageRatio] = useState(1.414)
  const [flip, setFlip] = useState<'next' | 'prev' | null>(null)
  const firstImage = pages.find((page) => page.image?.secureUrl)?.image?.secureUrl || ''

  useEffect(() => {
    const media = window.matchMedia('(min-width: 780px)')
    function sync() {
      setSpread(media.matches)
      setFlip(null)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!firstImage) return
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) {
        setPageRatio(image.naturalWidth / image.naturalHeight)
      }
    }
    image.src = firstImage
  }, [firstImage])

  const step = spread ? 2 : 1
  const last = Math.max(0, pages.length - (spread && pages.length % 2 === 0 ? 2 : 1))
  const canPrev = index > 0 && !flip
  const canNext = index < last && !flip
  const flipRef = useRef(flip)
  flipRef.current = flip
  const bookRatio = spread ? pageRatio * 2 : pageRatio

  function finish() {
    const direction = flipRef.current
    if (!direction) return
    flipRef.current = null
    setIndex((current) => current + (direction === 'next' ? step : -step))
    setFlip(null)
  }

  function go(direction: 'next' | 'prev') {
    if (flip) return
    if (direction === 'next' && !canNext) return
    if (direction === 'prev' && !canPrev) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIndex((current) => current + (direction === 'next' ? step : -step))
      return
    }
    setFlip(direction)
  }

  useEffect(() => {
    if (!flip) return
    const timer = window.setTimeout(finish, FLIP_MS)
    return () => window.clearTimeout(timer)
  }, [flip, step])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go('next')
      if (event.key === 'ArrowLeft') go('prev')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, flip, spread, pages.length])

  const left = pages[index]
  const right = pages[index + 1]
  const nextLeft = pages[index + 2]
  const nextRight = pages[index + 3]
  const prevLeft = pages[index - 2]
  const prevRight = pages[index - 1]
  const pageLabel = spread
    ? `${index + 1}${right ? `–${index + 2}` : ''} of ${pages.length}`
    : `${index + 1} of ${pages.length}`

  return (
    <div className="profile-stage">
      <div className="profile-heading">
        <span className="kicker">Company profile</span>
        <h2>Open our <em>profile.</em></h2>
      </div>
      <div
        className={`profile-book-wrap${spread ? ' is-spread' : ' is-single'}`}
        style={{ ['--page-ratio' as string]: String(pageRatio), ['--book-ratio' as string]: String(bookRatio) }}
      >
        <div className={`profile-book${flip ? ` is-${flip}` : ''}`}>
          {spread ? (
            <>
              <div className="profile-static left" onClick={() => go('prev')}>
                <Sheet page={flip === 'prev' ? prevLeft : left} side="left" cover={index === 0 && flip !== 'prev'} />
              </div>
              <div className="profile-static right" onClick={() => go('next')}>
                <Sheet page={flip === 'next' ? nextRight : right} side="right" />
              </div>
            </>
          ) : (
            <div className="profile-static single" onClick={() => go('next')}>
              <Sheet page={flip === 'next' ? pages[index + 1] : left} side="single" cover={index === 0 && !flip} />
            </div>
          )}

          {flip === 'next' && (
            <div className="profile-leaf next" onAnimationEnd={(event) => event.target === event.currentTarget && finish()}>
              <div className="profile-face front">
                <Sheet page={spread ? right : left} side={spread ? 'right' : 'single'} />
                <span className="profile-curl" />
              </div>
              <div className="profile-face back">
                <Sheet page={spread ? nextLeft : pages[index + 1]} side={spread ? 'left' : 'single'} />
                <span className="profile-curl back" />
              </div>
            </div>
          )}
          {flip === 'prev' && (
            <div className="profile-leaf prev" onAnimationEnd={(event) => event.target === event.currentTarget && finish()}>
              <div className="profile-face front">
                <Sheet page={left} side={spread ? 'left' : 'single'} cover={index === 0} />
                <span className="profile-curl" />
              </div>
              <div className="profile-face back">
                <Sheet page={spread ? prevRight : pages[index - 1]} side={spread ? 'right' : 'single'} />
                <span className="profile-curl back" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="profile-controls">
        <button type="button" className="related-arrow" onClick={() => go('prev')} disabled={!canPrev} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <span>{pageLabel}</span>
        <button type="button" className="related-arrow" onClick={() => go('next')} disabled={!canNext} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
