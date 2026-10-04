import type { EventBlock } from '@/lib/event-body'

export type MediaAsset = {
  publicId: string
  secureUrl: string
  installation?: boolean
}

export type Installation = {
  _id: string
  title: string
  slug: string
  facility: string
  location: string
  body: string
  productIds: string[]
  categoryIds: string[]
  cover: MediaAsset | null
  published: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export type Offer = {
  _id: string
  title: string
  description: string
  discountText: string
  kind: 'products' | 'custom'
  productIds: string[]
  price: number
  compareAt: number
  customProductId: string
  startDate: string
  endDate: string
  banner: MediaAsset | null
  showHeader: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

export type OfferEvent = {
  _id: string
  offerId: string
  productId: string
  productName: string
  eventType: 'click' | 'whatsapp'
  path: string
  visitorId: string
  createdAt: string
}

export type EventPost = {
  _id: string
  title: string
  slug: string
  description: string
  startAt: string
  location: string
  cover: MediaAsset | null
  registrationUrl: string
  body: EventBlock[]
  published: boolean
  createdAt: string
  updatedAt: string
}

export type Catalogue = {
  _id: string
  title: string
  erpProductId: string
  categoryId: string
  productName: string
  file: MediaAsset
  downloadCount: number
  createdAt: string
  updatedAt: string
}

export type CatalogueDownload = {
  _id: string
  catalogueId: string
  productId: string
  ipHash: string
  referrer: string
  createdAt: string
}

export type ManufacturerSubmission = {
  _id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  website: string
  productsOfInterest: string
  notes: string
  brochure: MediaAsset | null
  status: 'pending' | 'approved' | 'rejected'
  token: string
  adminNote: string
  createdAt: string
  updatedAt: string
}

export type RedirectRule = {
  _id: string
  from: string
  to: string
  status: number
  createdAt: string
  updatedAt: string
}

export type CompanyProfilePage = {
  _id: string
  title: string
  body: string
  image: MediaAsset | null
  order: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export function eventHref(item: Pick<EventPost, 'slug'>) {
  return `/events/${item.slug}`
}

export function installationHref(item: Pick<Installation, 'slug'>) {
  return `/project/${item.slug}`
}

export function csvIds(value: string) {
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean)
}

export function catalogueDownloadHref(
  product: { id: string },
  catalogues: Array<Pick<Catalogue, '_id' | 'erpProductId' | 'createdAt'>>,
) {
  const match = catalogues
    .filter((item) => item.erpProductId === product.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
  if (!match) return ''
  return `/api/catalogues/${match._id}/download?productId=${encodeURIComponent(product.id)}`
}

export function normalizePath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return ''
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.replace(/\/+$/, '') || '/'
}
