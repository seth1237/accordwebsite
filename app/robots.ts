import type { MetadataRoute } from 'next'
import { COMPANY } from '@/lib/utils'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${COMPANY.url}/sitemap.xml`,
    host: COMPANY.url,
  }
}
