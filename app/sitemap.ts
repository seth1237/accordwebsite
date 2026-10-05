import type { MetadataRoute } from 'next'
import { categoryHref, productHref } from '@/lib/catalog'
import { getCatalog, listEvents, listInstallations, listJobs, listOffers } from '@/lib/site-data'
import { jobHref } from '@/lib/jobs'
import { eventHref, installationHref, offerHref } from '@/lib/content'
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
    { url: `${base}${ROUTES.offers}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}${ROUTES.events}`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}${ROUTES.manufacturers}`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}${ROUTES.quote}`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

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
    const [jobs, installations, events, offers] = await Promise.all([
      listJobs(true),
      listInstallations(true).catch(() => []),
      listEvents(true).catch(() => []),
      listOffers(true).catch(() => []),
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
    for (const item of events) {
      pages.push({
        url: `${base}${eventHref(item)}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.4,
      })
    }
    for (const item of offers) {
      pages.push({
        url: `${base}${offerHref(item)}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.65,
      })
    }
  } catch {
    return pages
  }

  return pages
}
