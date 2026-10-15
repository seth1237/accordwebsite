export const ROUTES = {
  home: '/',
  about: '/about.html',
  products: '/products',
  projects: '/projects',
  jobs: '/jobs',
  jobsApply: '/jobs/apply',
  news: '/news',
  contact: '/get-in-touch/contact',
  cart: '/cart/view',
  quote: '/customer-request/get-quote',
  checkout: '/checkout',
  account: '/account',
  accountLogin: '/account/login',
  accountRegister: '/account/register',
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
