export const ROUTES = {
  home: '/',
  about: '/about.html',
  products: '/products',
  projects: '/projects',
  jobs: '/jobs',
  news: '/news',
  contact: '/get-in-touch/contact',
  cart: '/cart/view',
  quote: '/customer-request/get-quote',
  events: '/events',
  offers: '/offers',
  manufacturers: '/manufacturers',
  manufacturersApply: '/manufacturers/apply',
  biomedical: '/biomedical-engineering-services.html',
} as const

export function vacancyHref(slug: string) {
  return `/vacancy/${slug}`
}

export function projectHref(slug: string) {
  return `/project/${slug}`
}
