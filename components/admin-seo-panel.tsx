'use client'

import { useEffect, useMemo, useState } from 'react'
import { COMPANY } from '@/lib/utils'
import { emptySeo, scoreSeo, suggestSeo, type SeoFields } from '@/lib/seo-fields'

export function AdminSeoPanel({
  sourceName,
  sourceDescription = '',
  hasImage = false,
  hasInternalLinks = false,
  defaults,
  pathPrefix,
}: {
  sourceName: string
  sourceDescription?: string
  hasImage?: boolean
  hasInternalLinks?: boolean
  defaults?: Partial<SeoFields>
  pathPrefix: '/product/' | '/offers/'
}) {
  const suggested = useMemo(() => suggestSeo(sourceName, sourceDescription), [sourceName, sourceDescription])
  const [seo, setSeo] = useState<SeoFields>(() => ({
    ...suggested,
    ...emptySeo(),
    ...Object.fromEntries(Object.entries(defaults || {}).filter(([, value]) => value)),
  }))
  const [touched, setTouched] = useState<Partial<Record<keyof SeoFields, boolean>>>(() => {
    const next: Partial<Record<keyof SeoFields, boolean>> = {}
    for (const key of Object.keys(emptySeo()) as Array<keyof SeoFields>) {
      if (defaults?.[key]) next[key] = true
    }
    return next
  })

  useEffect(() => {
    setSeo((current) => ({
      focusKeyword: touched.focusKeyword ? current.focusKeyword : suggested.focusKeyword,
      seoTitle: touched.seoTitle ? current.seoTitle : suggested.seoTitle,
      seoDescription: touched.seoDescription ? current.seoDescription : suggested.seoDescription,
      seoSlug: touched.seoSlug ? current.seoSlug : suggested.seoSlug,
      seoKeywords: touched.seoKeywords ? current.seoKeywords : suggested.seoKeywords,
      imageAlt: touched.imageAlt ? current.imageAlt : suggested.imageAlt,
    }))
  }, [suggested, touched])

  const readiness = scoreSeo({
    seo,
    description: sourceDescription,
    hasImage,
    hasInternalLinks,
  })

  function update<K extends keyof SeoFields>(key: K, value: string) {
    setTouched((current) => ({ ...current, [key]: true }))
    setSeo((current) => ({ ...current, [key]: value }))
  }

  return (
    <fieldset className="admin-seo">
      <legend>SEO & Search Optimization</legend>
      <p>Suggested from the name. Edit before publishing so Google gets a clean title, description, and URL.</p>
      <label>
        Focus Keyword
        <input name="focusKeyword" value={seo.focusKeyword} onChange={(event) => update('focusKeyword', event.target.value)} placeholder="7 parameter patient monitor" />
      </label>
      <label>
        SEO Title
        <input name="seoTitle" value={seo.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} placeholder={`${sourceName || 'Product'} in Kenya | ${COMPANY.name}`} />
      </label>
      <label>
        Meta Description
        <textarea name="seoDescription" rows={3} value={seo.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} placeholder="Get reliable equipment for hospitals and clinics in Kenya." />
        <small>{seo.seoDescription.length}/160</small>
      </label>
      <label>
        URL Slug
        <input name="seoSlug" value={seo.seoSlug} onChange={(event) => update('seoSlug', event.target.value)} placeholder="7-parameter-patient-monitor" />
      </label>
      <label>
        Related search terms
        <input name="seoKeywords" value={seo.seoKeywords} onChange={(event) => update('seoKeywords', event.target.value)} placeholder="patient monitor, multiparameter monitor, patient monitor Kenya" />
      </label>
      <label>
        Image Alt Text
        <input name="imageAlt" value={seo.imageAlt} onChange={(event) => update('imageAlt', event.target.value)} placeholder={sourceName || 'Product photo'} />
      </label>
      <div className="admin-seo-preview" aria-label="Search preview">
        <span>Search preview</span>
        <strong>{seo.seoTitle || suggested.seoTitle || 'Title will appear here'}</strong>
        <em>{COMPANY.domain}{pathPrefix}{seo.seoSlug || suggested.seoSlug || 'url'}</em>
        <p>{seo.seoDescription || suggested.seoDescription || 'Meta description will appear here.'}</p>
      </div>
      <div className={`admin-seo-score ${readiness.score >= 80 ? 'is-good' : readiness.score >= 50 ? 'is-ok' : 'is-low'}`}>
        <b>SEO Readiness: {readiness.score}/100</b>
        <div className="admin-seo-bar" style={{ ['--seo-score' as string]: `${readiness.score}%` }} />
        <ul>
          {readiness.checks.map((item) => (
            <li key={item.id} className={item.ok ? 'ok' : item.warn ? 'warn' : 'missing'}>
              {item.ok ? 'Yes' : item.warn ? 'Check' : 'No'} {item.label}
            </li>
          ))}
        </ul>
      </div>
    </fieldset>
  )
}
