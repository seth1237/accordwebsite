import type { MediaAsset } from '@/lib/content'

export type EventBlock =
  | { id: string; type: 'paragraph'; html: string }
  | { id: string; type: 'heading'; level: 2 | 3; text: string }
  | { id: string; type: 'image'; image: MediaAsset; alt: string; caption: string }
  | { id: string; type: 'quote'; text: string; cite: string }
  | { id: string; type: 'list'; ordered: boolean; items: string[] }
  | { id: string; type: 'link'; url: string; label: string; note: string }
  | { id: string; type: 'video'; url: string }
  | { id: string; type: 'divider' }

export type EventBlockType = EventBlock['type']

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

export function isSafeHref(value: string) {
  const href = String(value || '').trim()
  if (!href) return false
  if (href.startsWith('/') && !href.startsWith('//')) return true
  return /^(https?:\/\/|mailto:)/i.test(href)
}

export function sanitizeRichText(raw: string) {
  let html = String(raw || '')
  html = html.replace(/<\/?(script|style|iframe|object|embed|form|input|textarea|button)[^>]*>/gi, '')
  html = html.replace(/<\/?(?!\/?(b|strong|i|em|a|br)\b)[a-z][^\s>/]*\b[^>]*>/gi, '')
  html = html.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || ''
    if (!isSafeHref(href)) return ''
    const blank = href.startsWith('/') ? '' : ' target="_blank" rel="noopener noreferrer"'
    return `<a href="${escapeAttr(href)}"${blank}>`
  })
  html = html.replace(/\s(on\w+|style|class)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return html.trim()
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function asMedia(value: unknown): MediaAsset | null {
  if (!value || typeof value !== 'object') return null
  const image = value as MediaAsset
  if (!image.secureUrl) return null
  return { publicId: String(image.publicId || ''), secureUrl: String(image.secureUrl) }
}

export function createBlock(type: EventBlockType): EventBlock {
  const id = newId()
  if (type === 'heading') return { id, type, level: 2, text: '' }
  if (type === 'image') return { id, type, image: { publicId: '', secureUrl: '' }, alt: '', caption: '' }
  if (type === 'quote') return { id, type, text: '', cite: '' }
  if (type === 'list') return { id, type, ordered: false, items: [''] }
  if (type === 'link') return { id, type, url: '', label: '', note: '' }
  if (type === 'video') return { id, type, url: '' }
  if (type === 'divider') return { id, type }
  return { id, type: 'paragraph', html: '' }
}

function normalizeBlock(value: unknown): EventBlock | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<EventBlock> & { type?: string }
  const id = String(raw.id || newId())
  if (raw.type === 'heading') {
    return { id, type: 'heading', level: raw.level === 3 ? 3 : 2, text: String('text' in raw ? raw.text || '' : '') }
  }
  if (raw.type === 'image') {
    const image = asMedia('image' in raw ? raw.image : null)
    if (!image) return null
    return { id, type: 'image', image, alt: String('alt' in raw ? raw.alt || '' : ''), caption: String('caption' in raw ? raw.caption || '' : '') }
  }
  if (raw.type === 'quote') {
    return { id, type: 'quote', text: String('text' in raw ? raw.text || '' : ''), cite: String('cite' in raw ? raw.cite || '' : '') }
  }
  if (raw.type === 'list') {
    const items = Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items.map((item) => String(item || '').trim()).filter(Boolean)
      : []
    return { id, type: 'list', ordered: Boolean((raw as { ordered?: boolean }).ordered), items: items.length ? items : [''] }
  }
  if (raw.type === 'link') {
    return {
      id,
      type: 'link',
      url: String('url' in raw ? raw.url || '' : ''),
      label: String('label' in raw ? raw.label || '' : ''),
      note: String('note' in raw ? raw.note || '' : ''),
    }
  }
  if (raw.type === 'video') return { id, type: 'video', url: String('url' in raw ? raw.url || '' : '') }
  if (raw.type === 'divider') return { id, type: 'divider' }
  return { id, type: 'paragraph', html: sanitizeRichText(String('html' in raw ? raw.html || '' : '')) }
}

export function parseEventBody(value: unknown, fallbackText = ''): EventBlock[] {
  if (Array.isArray(value)) return value.map(normalizeBlock).filter((block): block is EventBlock => Boolean(block))
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        return parseEventBody(JSON.parse(trimmed))
      } catch {
        /* fall through */
      }
    }
    if (trimmed) {
      return [{ id: newId(), type: 'paragraph', html: escapeHtml(trimmed).replace(/\n/g, '<br>') }]
    }
  }
  if (fallbackText.trim()) {
    return [{ id: newId(), type: 'paragraph', html: escapeHtml(fallbackText.trim()).replace(/\n/g, '<br>') }]
  }
  return []
}

export function eventPoster(input: { cover?: MediaAsset | null; body?: EventBlock[] }): MediaAsset | null {
  if (input.cover?.secureUrl) return input.cover
  const block = (input.body || []).find((item) => item.type === 'image' && item.image.secureUrl)
  return block && block.type === 'image' ? block.image : null
}

export function excerptFromBody(blocks: EventBlock[], fallback = '') {
  const paragraph = blocks.find((block) => block.type === 'paragraph' && block.html.replace(/<[^>]+>/g, '').trim())
  if (paragraph && paragraph.type === 'paragraph') {
    return paragraph.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const heading = blocks.find((block) => block.type === 'heading' && block.text.trim())
  if (heading && heading.type === 'heading') return heading.text.trim()
  return fallback.trim()
}

export function youtubeId(url: string) {
  const match = String(url || '').trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)
  return match?.[1] || ''
}

export function vimeoId(url: string) {
  const match = String(url || '').trim().match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] || ''
}
