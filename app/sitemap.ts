import type { MetadataRoute } from 'next'
import { categoryHref, productHref } from '@/lib/catalog'
import { getCatalog, listInstallations, listJobs } from '@/lib/site-data'
import { jobHref } from '@/lib/jobs'
import { newsPostHref, newsPosts } from '@/lib/news'
import { installationHref } from '@/lib/content'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = COMPANY.url
  const now = new Date()
  const pages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}${ROUTES.products}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}${ROUTES.about}`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}${ROUTES.contact}`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}${ROUTES.biomedical}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}${ROUTES.jobs}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}${ROUTES.projects}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}${ROUTES.news}`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}${ROUTES.offers}`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}${ROUTES.events}`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}${ROUTES.manufacturers}`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}${ROUTES.quote}`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  for (const post of newsPosts) {
    pages.push({
      url: `${base}${newsPostHref(post)}`,
      lastModified: new Date(post.isoDate),
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  try {
    const catalog = await getCatalog()
    for (const product of catalog.products) {
      pages.push({
        url: `${base}${productHref(product)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
    for (const category of catalog.categories) {
      if (category.slug === 'all' || category.slug === 'uncategorized') continue
      pages.push({
        url: `${base}${categoryHref(category)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
    const [jobs, installations] = await Promise.all([
      listJobs(true),
      listInstallations(true).catch(() => []),
    ])
    for (const job of jobs) {
      pages.push({
        url: `${base}${jobHref(job)}`,
        lastModified: new Date(job.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.4,
      })
    }
    for (const item of installations) {
      pages.push({
        url: `${base}${installationHref(item)}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.4,
      })
    }
  } catch {
    return pages
  }

  return pages
}
