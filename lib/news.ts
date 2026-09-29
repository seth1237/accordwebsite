export type NewsPost = {
  slug: string
  title: string
  tag: string
  date: string
  summary: string
  body: string[]
}

export const newsPosts: NewsPost[] = [
  {
    slug: 'equipping-laboratories-for-reliable-diagnostics',
    tag: 'Clinical insight',
    date: '19 Aug 2026',
    title: 'Equipping laboratories for reliable diagnostics',
    summary: 'How the right consumables and equipment keep Kenyan facilities running.',
    body: [
      'Reliable diagnostics start with equipment and consumables that facilities can actually keep in service.',
      'From hematology and chemistry analyzers to cold-chain storage, the right mix of products and after-sales support keeps hospital and clinic laboratories running.',
    ],
  },
  {
    slug: 'accord-medical-serving-hospitals-from-nairobi',
    tag: 'Company news',
    date: '04 Aug 2026',
    title: 'Accord Medical serving hospitals from Nairobi',
    summary: 'Closer support for clinics and laboratories across the region.',
    body: [
      'Accord Medical Supplies works with hospitals, clinics, and laboratories across Kenya and Uganda.',
      'From the Nairobi warehouse and sales team, we help facilities source, install, and maintain medical equipment.',
    ],
  },
]

export function getPostBySlug(slug: string) {
  return newsPosts.find((post) => post.slug === slug) || null
}

export function newsPostHref(post: Pick<NewsPost, 'slug'>) {
  return `/post/${post.slug}`
}
