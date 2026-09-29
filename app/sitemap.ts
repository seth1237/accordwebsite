import type { MetadataRoute } from 'next'
import { categoryHref, productHref } from '@/lib/catalog'
import { getCatalog, listEvents, listInstallations, listJobs, listOffers } from '@/lib/site-data'
import { jobHref } from '@/lib/jobs'
import { newsPostHref, newsPosts } from '@/lib/news'
import { installationHref } from '@/lib/content'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = COMPANY.url
  const pages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}${ROUTES.products}`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}${ROUTES.about}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}${ROUTES.contact}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}${ROUTES.news}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}${ROUTES.jobs}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}${ROUTES.projects}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}${ROUTES.offers}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}${ROUTES.events}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}${ROUTES.manufacturers}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}${ROUTES.quote}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  for (const post of newsPosts) {
    pages.push({
      url: `${base}${newsPostHref(post)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    })
  }

  try {
    const catalog = await getCatalog()
    for (const product of catalog.products) {
      pages.push({
        url: `${base}${productHref(product)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
    for (const category of catalog.categories) {
      pages.push({
        url: `${base}${categoryHref(category)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
    const [jobs, installations, offers, events] = await Promise.all([
      listJobs(true),
      listInstallations(true).catch(() => []),
      listOffers(true).catch(() => []),
      listEvents(true).catch(() => []),
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
    for (const item of offers) {
      pages.push({
        url: `${base}${ROUTES.offers}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.4,
      })
    }
    for (const item of events) {
      pages.push({
        url: `${base}${ROUTES.events}`,
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
