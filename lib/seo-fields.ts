import { slugifyName } from '@/lib/catalog'
import { COMPANY } from '@/lib/utils'

export type SeoFields = {
  focusKeyword: string
  seoTitle: string
  seoDescription: string
  seoSlug: string
  seoKeywords: string
  imageAlt: string
}

export type SeoCheck = {
  id: string
  label: string
  ok: boolean
  warn?: boolean
}

export function emptySeo(): SeoFields {
  return {
    focusKeyword: '',
    seoTitle: '',
    seoDescription: '',
    seoSlug: '',
    seoKeywords: '',
    imageAlt: '',
  }
}

export function parseSeo(value: unknown): SeoFields {
  let raw = value
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = {} }
  }
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    focusKeyword: String(row.focusKeyword || '').trim(),
    seoTitle: String(row.seoTitle || '').trim(),
    seoDescription: String(row.seoDescription || '').trim(),
    seoSlug: slugifyName(String(row.seoSlug || '')) || '',
    seoKeywords: String(row.seoKeywords || '').trim(),
    imageAlt: String(row.imageAlt || '').trim(),
  }
}

export function suggestSeo(name: string, description = ''): SeoFields {
  const title = String(name || '').trim()
  const slug = slugifyName(title)
  const keyword = title.toLowerCase()
  const about = description.replace(/\s+/g, ' ').trim()
  return {
    focusKeyword: keyword,
    seoTitle: title ? `${title} in Kenya | ${COMPANY.name}` : '',
    seoDescription: title
      ? about
        ? about
        : `Shop ${keyword} for hospitals and healthcare facilities in Kenya. Contact ${COMPANY.name} for pricing and quotations.`
      : '',
    seoSlug: slug,
    seoKeywords: keyword ? `${keyword}, ${keyword} Kenya, medical equipment Kenya` : '',
    imageAlt: title,
  }
}

export function scoreSeo(input: {
  seo: SeoFields
  description?: string
  hasImage?: boolean
  hasInternalLinks?: boolean
}) {
  const seo = input.seo
  const keyword = seo.focusKeyword.toLowerCase()
  const title = seo.seoTitle.toLowerCase()
  const meta = seo.seoDescription
  const body = String(input.description || '')
  const slug = seo.seoSlug
  const checks: SeoCheck[] = [
    { id: 'title', label: 'SEO title exists', ok: seo.seoTitle.length >= 20 },
    { id: 'keyword-title', label: 'Focus keyword in title', ok: Boolean(keyword) && title.includes(keyword) },
    { id: 'keyword-meta', label: 'Focus keyword in description', ok: Boolean(keyword) && meta.toLowerCase().includes(keyword) },
    { id: 'slug', label: 'URL is clean', ok: Boolean(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) },
    { id: 'image', label: 'Image added', ok: Boolean(input.hasImage) },
    { id: 'alt', label: 'Image alt text added', ok: seo.imageAlt.length >= 4 },
    { id: 'copy', label: 'Description is sufficient', ok: body.length >= 80 || meta.length >= 80 },
    { id: 'links', label: 'Internal links added', ok: Boolean(input.hasInternalLinks) },
    { id: 'meta-length', label: 'Meta description length', ok: meta.length >= 120 && meta.length <= 160, warn: meta.length > 0 && (meta.length < 120 || meta.length > 160) },
  ]
  const score = Math.round((checks.filter((item) => item.ok).length / checks.length) * 100)
  return { score, checks }
}

export function seoKeywordsList(value: string) {
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean)
}
