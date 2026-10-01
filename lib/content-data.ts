import { createHash, randomBytes } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { slugifyName } from '@/lib/catalog'
import type {
  Catalogue,
  CatalogueDownload,
  CompanyProfilePage,
  EventPost,
  Installation,
  ManufacturerSubmission,
  MediaAsset,
  Offer,
  RedirectRule,
} from '@/lib/content'
import { normalizePath } from '@/lib/content'
import { isCloudinaryConfigured, uploadSiteImage } from '@/lib/cloudinary'
import { excerptFromBody, parseEventBody } from '@/lib/event-body'
import { prepareStoredImage } from '@/lib/image-convert'
import { ensureIndexes, getCollection, isMongoConfigured } from '@/lib/mongodb'
import {
  isMysqlConfigured,
  mysqlAddEventComment,
  mysqlCatalogueAnalytics,
  mysqlCreateCatalogue,
  mysqlDeleteCatalogue,
  mysqlDeleteDoc,
  mysqlDeleteEventEngagement,
  mysqlGetCatalogue,
  mysqlGetDoc,
  mysqlGetDocByPayloadFrom,
  mysqlGetDocBySlug,
  mysqlGetEventEngagement,
  mysqlInsertDoc,
  mysqlListCatalogues,
  mysqlListDocs,
  mysqlDeleteFile,
  mysqlListProfilePages,
  mysqlRecordCatalogueDownload,
  mysqlSaveFile,
  mysqlToggleEventLike,
  mysqlUniqueSlug,
  mysqlUpdateDoc,
} from '@/lib/mysql'
import { renderPdfPages } from '@/lib/pdf-pages'

type WithDates<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'startDate' | 'endDate' | 'startAt'> & {
  _id?: ObjectId
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  startDate?: Date
  endDate?: Date
  startAt?: Date
}

function iso(value?: Date | string | null) {
  if (!value) return ''
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function parseDate(value: string | Date | undefined, fallback = new Date()) {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function ids(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value || '').split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean)
}

function mysqlKind(collectionName: string) {
  const map: Record<string, string> = {
    installations: 'installation',
    installation: 'installation',
    offers: 'offer',
    offer: 'offer',
    events: 'event',
    event: 'event',
    manufacturers: 'manufacturer',
    manufacturer: 'manufacturer',
    redirects: 'redirect',
    redirect: 'redirect',
    company_profile_pages: 'company-profile',
    'company-profile': 'company-profile',
  }
  return map[collectionName] || collectionName
}

function mongoCollection(collectionName: string) {
  const map: Record<string, string> = {
    installation: 'installations',
    offer: 'offers',
    event: 'events',
    manufacturer: 'manufacturers',
    redirect: 'redirects',
    'company-profile': 'company_profile_pages',
  }
  return map[collectionName] || collectionName
}

async function uniqueSlug(collectionName: string, base: string, excludeId?: string) {
  if (isMysqlConfigured()) return mysqlUniqueSlug(mysqlKind(collectionName), base, excludeId)
  const collection = await getCollection<{ slug: string; _id?: ObjectId }>(mongoCollection(collectionName))
  const root = base || 'item'
  let slug = root
  let n = 2
  while (true) {
    const existing = await collection.findOne({ slug })
    if (!existing || (excludeId && String(existing._id) === excludeId)) return slug
    slug = `${root}-${n}`
    n += 1
  }
}

function serializeInstallation(doc: WithDates<Installation> & { _id: ObjectId }): Installation {
  return {
    _id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    facility: doc.facility || '',
    location: doc.location || '',
    body: doc.body || '',
    productIds: ids(doc.productIds),
    categoryIds: ids(doc.categoryIds),
    cover: doc.cover || null,
    published: Boolean(doc.published),
    publishedAt: iso(doc.publishedAt || doc.createdAt),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function serializeOffer(doc: WithDates<Offer> & { _id: ObjectId }): Offer {
  return {
    _id: String(doc._id),
    title: doc.title,
    description: doc.description || '',
    discountText: doc.discountText || '',
    productIds: ids(doc.productIds),
    startDate: iso(doc.startDate),
    endDate: iso(doc.endDate),
    banner: doc.banner || null,
    published: Boolean(doc.published),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function serializeEvent(doc: {
  _id: unknown
  title?: string
  slug?: string
  description?: string
  startAt?: string | Date
  location?: string
  cover?: EventPost['cover']
  registrationUrl?: string
  body?: unknown
  published?: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}): EventPost {
  const body = parseEventBody(doc.body, doc.description || '')
  const title = doc.title || ''
  return {
    _id: String(doc._id),
    title,
    slug: doc.slug || slugifyName(title) || String(doc._id),
    description: doc.description || excerptFromBody(body) || '',
    startAt: iso(doc.startAt),
    location: doc.location || '',
    cover: doc.cover || null,
    registrationUrl: doc.registrationUrl || '',
    body,
    published: Boolean(doc.published),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function serializeCatalogue(doc: WithDates<Catalogue> & { _id: ObjectId; downloadCount?: number }): Catalogue {
  return {
    _id: String(doc._id),
    title: doc.title,
    erpProductId: doc.erpProductId || '',
    categoryId: doc.categoryId || '',
    productName: doc.productName || '',
    file: doc.file,
    downloadCount: Number(doc.downloadCount) || 0,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function serializeManufacturer(doc: WithDates<ManufacturerSubmission> & { _id: ObjectId }): ManufacturerSubmission {
  return {
    _id: String(doc._id),
    companyName: doc.companyName,
    contactName: doc.contactName || '',
    email: doc.email,
    phone: doc.phone || '',
    website: doc.website || '',
    productsOfInterest: doc.productsOfInterest || '',
    notes: doc.notes || '',
    brochure: doc.brochure || null,
    status: doc.status || 'pending',
    token: doc.token,
    adminNote: doc.adminNote || '',
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

function serializeRedirect(doc: WithDates<RedirectRule> & { _id: ObjectId }): RedirectRule {
  return {
    _id: String(doc._id),
    from: doc.from,
    to: doc.to,
    status: Number(doc.status) || 301,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

export async function listInstallations(publishedOnly = false): Promise<Installation[]> {
  if (isMysqlConfigured()) return mysqlListDocs<Installation>('installation', publishedOnly)
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<Installation>>('installations')
  const filter = publishedOnly ? { published: true } : {}
  const docs = await collection.find(filter).sort({ publishedAt: -1, createdAt: -1 }).toArray()
  return docs.map((doc) => serializeInstallation(doc as WithDates<Installation> & { _id: ObjectId }))
}

export async function getInstallationBySlug(slug: string): Promise<Installation | null> {
  if (isMysqlConfigured()) return slug ? mysqlGetDocBySlug<Installation>('installation', slug) : null
  if (!isMongoConfigured() || !slug) return null
  await ensureIndexes()
  const collection = await getCollection<WithDates<Installation>>('installations')
  const doc = await collection.findOne({ slug })
  return doc ? serializeInstallation(doc as WithDates<Installation> & { _id: ObjectId }) : null
}

export async function getInstallationById(id: string): Promise<Installation | null> {
  if (isMysqlConfigured()) return mysqlGetDoc<Installation>('installation', id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<Installation>>('installations')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeInstallation(doc as WithDates<Installation> & { _id: ObjectId }) : null
}

export async function createInstallation(input: Omit<Installation, '_id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug'> & { slug?: string }): Promise<Installation> {
  const now = new Date()
  const slug = await uniqueSlug('installation', input.slug || slugifyName(input.title) || 'installation')
  if (isMysqlConfigured()) {
    return mysqlInsertDoc<Installation>('installation', {
      title: input.title,
      slug,
      facility: input.facility,
      location: input.location,
      body: input.body,
      productIds: ids(input.productIds),
      categoryIds: ids(input.categoryIds),
      cover: input.cover || null,
      published: input.published,
      publishedAt: now.toISOString(),
    })
  }
  await ensureIndexes()
  const doc = {
    title: input.title,
    slug,
    facility: input.facility,
    location: input.location,
    body: input.body,
    productIds: ids(input.productIds),
    categoryIds: ids(input.categoryIds),
    cover: input.cover || null,
    published: input.published,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCollection<WithDates<Installation>>('installations')
  const result = await collection.insertOne(doc)
  return serializeInstallation({ ...doc, _id: result.insertedId } as WithDates<Installation> & { _id: ObjectId })
}

export async function updateInstallation(id: string, input: Partial<Installation>): Promise<Installation | null> {
  if (isMysqlConfigured()) {
    const existing = await getInstallationById(id)
    if (!existing) return null
    const slug = input.slug !== undefined ? await uniqueSlug('installation', input.slug, id) : existing.slug
    return mysqlUpdateDoc<Installation>('installation', id, {
      ...input,
      productIds: input.productIds !== undefined ? ids(input.productIds) : existing.productIds,
      categoryIds: input.categoryIds !== undefined ? ids(input.categoryIds) : existing.categoryIds,
      slug,
    })
  }
  if (!ObjectId.isValid(id)) return null
  await ensureIndexes()
  const collection = await getCollection<WithDates<Installation>>('installations')
  const $set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) $set.title = input.title
  if (input.facility !== undefined) $set.facility = input.facility
  if (input.location !== undefined) $set.location = input.location
  if (input.body !== undefined) $set.body = input.body
  if (input.productIds !== undefined) $set.productIds = ids(input.productIds)
  if (input.categoryIds !== undefined) $set.categoryIds = ids(input.categoryIds)
  if (input.cover !== undefined) $set.cover = input.cover
  if (input.published !== undefined) $set.published = input.published
  if (input.slug !== undefined) $set.slug = await uniqueSlug('installations', input.slug, id)
  await collection.updateOne({ _id: new ObjectId(id) }, { $set })
  return getInstallationById(id)
}

export async function deleteInstallation(id: string): Promise<Installation | null> {
  if (isMysqlConfigured()) return mysqlDeleteDoc<Installation>('installation', id)
  const existing = await getInstallationById(id)
  if (!existing) return null
  const collection = await getCollection('installations')
  await collection.deleteOne({ _id: new ObjectId(id) })
  return existing
}

export async function listOffers(publishedOnly = false): Promise<Offer[]> {
  if (isMysqlConfigured()) {
    const offers = await mysqlListDocs<Offer>('offer', publishedOnly)
    if (!publishedOnly) return offers
    const now = Date.now()
    return offers.filter((offer) => {
      const start = new Date(offer.startDate).getTime()
      const end = new Date(offer.endDate).getTime()
      return (!start || start <= now) && (!end || end >= now)
    })
  }
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<Offer>>('offers')
  const filter = publishedOnly ? { published: true } : {}
  const docs = await collection.find(filter).sort({ startDate: -1 }).toArray()
  const offers = docs.map((doc) => serializeOffer(doc as WithDates<Offer> & { _id: ObjectId }))
  if (!publishedOnly) return offers
  const now = Date.now()
  return offers.filter((offer) => {
    const start = new Date(offer.startDate).getTime()
    const end = new Date(offer.endDate).getTime()
    return (!start || start <= now) && (!end || end >= now)
  })
}

export async function getOfferById(id: string): Promise<Offer | null> {
  if (isMysqlConfigured()) return mysqlGetDoc<Offer>('offer', id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<Offer>>('offers')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeOffer(doc as WithDates<Offer> & { _id: ObjectId }) : null
}

export async function createOffer(input: Omit<Offer, '_id' | 'createdAt' | 'updatedAt'>): Promise<Offer> {
  if (isMysqlConfigured()) {
    const now = new Date()
    return mysqlInsertDoc<Offer>('offer', {
      title: input.title,
      description: input.description,
      discountText: input.discountText,
      productIds: ids(input.productIds),
      startDate: parseDate(input.startDate, now).toISOString(),
      endDate: parseDate(input.endDate, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)).toISOString(),
      banner: input.banner || null,
      published: input.published,
    })
  }
  await ensureIndexes()
  const now = new Date()
  const doc = {
    title: input.title,
    description: input.description,
    discountText: input.discountText,
    productIds: ids(input.productIds),
    startDate: parseDate(input.startDate, now),
    endDate: parseDate(input.endDate, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
    banner: input.banner || null,
    published: input.published,
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCollection<WithDates<Offer> & { _id?: ObjectId }>('offers')
  const result = await collection.insertOne(doc as WithDates<Offer>)
  return serializeOffer({ ...doc, _id: result.insertedId } as WithDates<Offer> & { _id: ObjectId })
}

export async function updateOffer(id: string, input: Partial<Offer>): Promise<Offer | null> {
  if (isMysqlConfigured()) {
    const existing = await getOfferById(id)
    if (!existing) return null
    return mysqlUpdateDoc<Offer>('offer', id, {
      ...input,
      productIds: input.productIds !== undefined ? ids(input.productIds) : existing.productIds,
      startDate: input.startDate !== undefined ? parseDate(input.startDate).toISOString() : existing.startDate,
      endDate: input.endDate !== undefined ? parseDate(input.endDate).toISOString() : existing.endDate,
    })
  }
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<Offer>>('offers')
  const $set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) $set.title = input.title
  if (input.description !== undefined) $set.description = input.description
  if (input.discountText !== undefined) $set.discountText = input.discountText
  if (input.productIds !== undefined) $set.productIds = ids(input.productIds)
  if (input.startDate !== undefined) $set.startDate = parseDate(input.startDate)
  if (input.endDate !== undefined) $set.endDate = parseDate(input.endDate)
  if (input.banner !== undefined) $set.banner = input.banner
  if (input.published !== undefined) $set.published = input.published
  await collection.updateOne({ _id: new ObjectId(id) }, { $set })
  return getOfferById(id)
}

export async function deleteOffer(id: string): Promise<Offer | null> {
  if (isMysqlConfigured()) return mysqlDeleteDoc<Offer>('offer', id)
  const existing = await getOfferById(id)
  if (!existing) return null
  await (await getCollection('offers')).deleteOne({ _id: new ObjectId(id) })
  return existing
}

export async function listEvents(publishedOnly = false): Promise<EventPost[]> {
  if (isMysqlConfigured()) {
    const docs = await mysqlListDocs<EventPost>('event', publishedOnly)
    return docs.map((doc) => serializeEvent(doc))
  }
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<EventPost>>('events')
  const filter = publishedOnly ? { published: true } : {}
  const docs = await collection.find(filter).sort({ startAt: 1 }).toArray()
  return docs.map((doc) => serializeEvent(doc))
}

export async function getEventById(id: string): Promise<EventPost | null> {
  if (isMysqlConfigured()) {
    const doc = await mysqlGetDoc<EventPost>('event', id)
    return doc ? serializeEvent(doc) : null
  }
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<EventPost>>('events')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeEvent(doc) : null
}

export async function getEventBySlug(slug: string): Promise<EventPost | null> {
  if (!slug) return null
  if (isMysqlConfigured()) {
    const doc = await mysqlGetDocBySlug<EventPost>('event', slug)
    const item = doc ? serializeEvent(doc) : null
    if (item) return item
    const listed = await listEvents(false)
    return listed.find((event) => event.slug === slug) || null
  }
  if (!isMongoConfigured()) return null
  await ensureIndexes()
  const collection = await getCollection<WithDates<EventPost>>('events')
  const doc = await collection.findOne({ slug })
  return doc ? serializeEvent(doc) : null
}

export async function createEvent(input: Omit<EventPost, '_id' | 'createdAt' | 'updatedAt'>): Promise<EventPost> {
  const slug = await uniqueSlug('event', input.slug || slugifyName(input.title) || 'event')
  const body = parseEventBody(input.body, input.description)
  const description = input.description || excerptFromBody(body)
  if (isMysqlConfigured()) {
    const inserted = await mysqlInsertDoc<EventPost>('event', {
      title: input.title,
      slug,
      description,
      startAt: parseDate(input.startAt).toISOString(),
      location: input.location,
      cover: input.cover || null,
      registrationUrl: input.registrationUrl,
      body,
      published: input.published,
    })
    return serializeEvent(inserted)
  }
  await ensureIndexes()
  const now = new Date()
  const doc = {
    title: input.title,
    slug,
    description,
    startAt: parseDate(input.startAt, now),
    location: input.location,
    cover: input.cover || null,
    registrationUrl: input.registrationUrl,
    body,
    published: input.published,
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCollection<WithDates<EventPost> & { _id?: ObjectId }>('events')
  const result = await collection.insertOne(doc as WithDates<EventPost>)
  return serializeEvent({ ...doc, _id: result.insertedId })
}

export async function updateEvent(id: string, input: Partial<EventPost>): Promise<EventPost | null> {
  const existing = await getEventById(id)
  if (!existing) return null
  const title = input.title !== undefined ? input.title : existing.title
  const slug = input.slug !== undefined || input.title !== undefined
    ? await uniqueSlug('event', input.slug || slugifyName(title) || existing.slug || 'event', id)
    : existing.slug
  const body = input.body !== undefined ? parseEventBody(input.body, input.description || existing.description) : existing.body
  const description = input.description !== undefined ? input.description : existing.description || excerptFromBody(body)
  const next = {
    ...input,
    title,
    slug,
    body,
    description,
    startAt: input.startAt !== undefined ? parseDate(input.startAt).toISOString() : existing.startAt,
  }
  if (isMysqlConfigured()) {
    const updated = await mysqlUpdateDoc<EventPost>('event', id, next)
    return updated ? serializeEvent(updated) : null
  }
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<EventPost>>('events')
  const $set: Record<string, unknown> = { updatedAt: new Date(), title, slug, body, description }
  if (input.startAt !== undefined) $set.startAt = parseDate(input.startAt)
  if (input.location !== undefined) $set.location = input.location
  if (input.cover !== undefined) $set.cover = input.cover
  if (input.registrationUrl !== undefined) $set.registrationUrl = input.registrationUrl
  if (input.published !== undefined) $set.published = input.published
  await collection.updateOne({ _id: new ObjectId(id) }, { $set })
  return getEventById(id)
}

export async function deleteEvent(id: string): Promise<EventPost | null> {
  if (isMysqlConfigured()) {
    const existing = await mysqlDeleteDoc<EventPost>('event', id)
    if (existing) await mysqlDeleteEventEngagement(id).catch(() => null)
    return existing
  }
  const existing = await getEventById(id)
  if (!existing) return null
  await (await getCollection('events')).deleteOne({ _id: new ObjectId(id) })
  return existing
}

function emptyEngagement() {
  return { likes: 0, liked: false, comments: [] }
}

function sanitizeCommentName(value: unknown) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function sanitizeCommentBody(value: unknown) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1000)
}

async function publishedEventBySlug(slug: string) {
  const item = await getEventBySlug(slug)
  return item?.published ? item : null
}

export async function getEventEngagement(slug: string, visitorId = '') {
  const item = await publishedEventBySlug(slug)
  if (!item) return null
  if (!isMysqlConfigured()) return emptyEngagement()
  return mysqlGetEventEngagement(item._id, visitorId)
}

export async function toggleEventLike(slug: string, visitorId: string) {
  const item = await publishedEventBySlug(slug)
  if (!item) return null
  if (!isMysqlConfigured()) return emptyEngagement()
  return mysqlToggleEventLike(item._id, visitorId)
}

export async function addEventComment(input: { slug: string; visitorId: string; name: string; body: string; honeypot?: string }) {
  if (String(input.honeypot || '').trim()) return getEventEngagement(input.slug, input.visitorId)
  const item = await publishedEventBySlug(input.slug)
  if (!item) return null
  const name = sanitizeCommentName(input.name)
  const body = sanitizeCommentBody(input.body)
  if (name.length < 2 || body.length < 3) throw new Error('Name and comment are required')
  if ((body.match(/https?:\/\//gi) || []).length > 2) throw new Error('Please remove extra links from the comment')
  if (!isMysqlConfigured()) throw new Error('Comments are unavailable right now')
  return mysqlAddEventComment({ eventId: item._id, visitorId: input.visitorId, name, body })
}

export async function listCatalogues(): Promise<Catalogue[]> {
  if (isMysqlConfigured()) return mysqlListCatalogues()
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<Catalogue>>('catalogues')
  const docs = await collection.find({}).sort({ downloadCount: -1, createdAt: -1 }).toArray()
  return docs.map((doc) => serializeCatalogue(doc as WithDates<Catalogue> & { _id: ObjectId }))
}

export async function listCataloguesForProduct(erpProductId: string): Promise<Catalogue[]> {
  if (isMysqlConfigured()) return erpProductId ? mysqlListCatalogues(erpProductId) : []
  if (!isMongoConfigured() || !erpProductId) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<Catalogue>>('catalogues')
  const docs = await collection.find({ erpProductId }).sort({ createdAt: -1 }).toArray()
  return docs.map((doc) => serializeCatalogue(doc as WithDates<Catalogue> & { _id: ObjectId }))
}

export async function getCatalogueById(id: string): Promise<Catalogue | null> {
  if (isMysqlConfigured()) return mysqlGetCatalogue(id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<Catalogue>>('catalogues')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeCatalogue(doc as WithDates<Catalogue> & { _id: ObjectId }) : null
}

export async function createCatalogue(input: Omit<Catalogue, '_id' | 'createdAt' | 'updatedAt' | 'downloadCount'> & {
  fileBytes?: Buffer
  filename?: string
  mime?: string
}): Promise<Catalogue> {
  if (isMysqlConfigured()) {
    if (!input.fileBytes?.length) throw new Error('Upload a PDF catalogue')
    return mysqlCreateCatalogue({
      title: input.title,
      erpProductId: input.erpProductId,
      categoryId: input.categoryId,
      productName: input.productName,
      filename: input.filename || 'catalogue.pdf',
      mime: input.mime || 'application/pdf',
      buffer: input.fileBytes,
    })
  }
  await ensureIndexes()
  const now = new Date()
  const { fileBytes: _fileBytes, filename: _filename, mime: _mime, ...fields } = input
  const doc = { ...fields, downloadCount: 0, createdAt: now, updatedAt: now }
  const collection = await getCollection<WithDates<Catalogue>>('catalogues')
  const result = await collection.insertOne(doc)
  return serializeCatalogue({ ...doc, _id: result.insertedId } as WithDates<Catalogue> & { _id: ObjectId })
}

export async function deleteCatalogue(id: string): Promise<Catalogue | null> {
  if (isMysqlConfigured()) return mysqlDeleteCatalogue(id)
  const existing = await getCatalogueById(id)
  if (!existing) return null
  await (await getCollection('catalogues')).deleteOne({ _id: new ObjectId(id) })
  return existing
}

export async function recordCatalogueDownload(input: {
  catalogueId: string
  productId?: string
  ip?: string
  referrer?: string
}): Promise<Catalogue | null> {
  if (isMysqlConfigured()) {
    const ipHash = createHash('sha256').update(`${input.ip || 'unknown'}:${process.env.ADMIN_SESSION_SECRET || 'tarumed'}`).digest('hex').slice(0, 24)
    return mysqlRecordCatalogueDownload({
      catalogueId: input.catalogueId,
      productId: input.productId,
      ipHash,
      referrer: input.referrer || '',
    })
  }
  const catalogue = await getCatalogueById(input.catalogueId)
  if (!catalogue) return null
  await ensureIndexes()
  const now = new Date()
  const ipHash = createHash('sha256').update(`${input.ip || 'unknown'}:${process.env.ADMIN_SESSION_SECRET || 'tarumed'}`).digest('hex').slice(0, 24)
  await (await getCollection<CatalogueDownload>('catalogue_downloads')).insertOne({
    catalogueId: input.catalogueId,
    productId: input.productId || catalogue.erpProductId,
    ipHash,
    referrer: input.referrer || '',
    createdAt: now,
  } as never)
  await (await getCollection('catalogues')).updateOne(
    { _id: new ObjectId(input.catalogueId) },
    { $inc: { downloadCount: 1 }, $set: { updatedAt: now } },
  )
  return getCatalogueById(input.catalogueId)
}

export async function catalogueAnalytics() {
  if (isMysqlConfigured()) return mysqlCatalogueAnalytics()
  const catalogues = await listCatalogues()
  const collection = isMongoConfigured() ? await getCollection<CatalogueDownload>('catalogue_downloads') : null
  const recent = collection
    ? await collection.find({}).sort({ createdAt: -1 }).limit(40).toArray()
    : []
  const total = catalogues.reduce((sum, item) => sum + item.downloadCount, 0)
  return {
    total,
    catalogues,
    recent: recent.map((row) => ({
      catalogueId: row.catalogueId,
      productId: row.productId,
      createdAt: iso(row.createdAt as unknown as Date),
      referrer: row.referrer,
    })),
  }
}

export async function listManufacturers(): Promise<ManufacturerSubmission[]> {
  if (isMysqlConfigured()) return mysqlListDocs<ManufacturerSubmission>('manufacturer')
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<ManufacturerSubmission>>('manufacturers')
  const docs = await collection.find({}).sort({ createdAt: -1 }).toArray()
  return docs.map((doc) => serializeManufacturer(doc as WithDates<ManufacturerSubmission> & { _id: ObjectId }))
}

export async function getManufacturerByToken(token: string): Promise<ManufacturerSubmission | null> {
  if (isMysqlConfigured()) {
    if (!token) return null
    const items = await mysqlListDocs<ManufacturerSubmission>('manufacturer')
    return items.find((item) => item.token === token) || null
  }
  if (!isMongoConfigured() || !token) return null
  await ensureIndexes()
  const collection = await getCollection<WithDates<ManufacturerSubmission>>('manufacturers')
  const doc = await collection.findOne({ token })
  return doc ? serializeManufacturer(doc as WithDates<ManufacturerSubmission> & { _id: ObjectId }) : null
}

export async function getManufacturerById(id: string): Promise<ManufacturerSubmission | null> {
  if (isMysqlConfigured()) return mysqlGetDoc<ManufacturerSubmission>('manufacturer', id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<ManufacturerSubmission>>('manufacturers')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeManufacturer(doc as WithDates<ManufacturerSubmission> & { _id: ObjectId }) : null
}

export async function createManufacturer(input: Omit<ManufacturerSubmission, '_id' | 'createdAt' | 'updatedAt' | 'token' | 'status' | 'adminNote'> & { status?: ManufacturerSubmission['status'] }): Promise<ManufacturerSubmission> {
  if (isMysqlConfigured()) {
    return mysqlInsertDoc<ManufacturerSubmission>('manufacturer', {
      ...input,
      status: input.status || 'pending',
      token: randomBytes(12).toString('hex'),
      adminNote: '',
      published: true,
    })
  }
  await ensureIndexes()
  const now = new Date()
  const doc = {
    ...input,
    status: input.status || 'pending',
    token: randomBytes(12).toString('hex'),
    adminNote: '',
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCollection<WithDates<ManufacturerSubmission>>('manufacturers')
  const result = await collection.insertOne(doc)
  return serializeManufacturer({ ...doc, _id: result.insertedId } as WithDates<ManufacturerSubmission> & { _id: ObjectId })
}

export async function updateManufacturer(id: string, input: Partial<Pick<ManufacturerSubmission, 'status' | 'adminNote'>>): Promise<ManufacturerSubmission | null> {
  if (isMysqlConfigured()) return mysqlUpdateDoc<ManufacturerSubmission>('manufacturer', id, input)
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<ManufacturerSubmission>>('manufacturers')
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: new Date() } })
  return getManufacturerById(id)
}

export async function listRedirects(): Promise<RedirectRule[]> {
  if (isMysqlConfigured()) {
    const items = await mysqlListDocs<RedirectRule>('redirect')
    return items.sort((a, b) => a.from.localeCompare(b.from))
  }
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<RedirectRule>>('redirects')
  const docs = await collection.find({}).sort({ from: 1 }).toArray()
  return docs.map((doc) => serializeRedirect(doc as WithDates<RedirectRule> & { _id: ObjectId }))
}

export async function getRedirectByFrom(from: string): Promise<RedirectRule | null> {
  const path = normalizePath(from)
  if (!path) return null
  if (isMysqlConfigured()) {
    return mysqlGetDocByPayloadFrom<RedirectRule>('redirect', path)
  }
  if (!isMongoConfigured()) return null
  await ensureIndexes()
  const collection = await getCollection<WithDates<RedirectRule>>('redirects')
  const doc = await collection.findOne({ from: path })
  return doc ? serializeRedirect(doc as WithDates<RedirectRule> & { _id: ObjectId }) : null
}

export async function getRedirectById(id: string): Promise<RedirectRule | null> {
  if (isMysqlConfigured()) return mysqlGetDoc<RedirectRule>('redirect', id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<RedirectRule>>('redirects')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeRedirect(doc as WithDates<RedirectRule> & { _id: ObjectId }) : null
}

export async function createRedirect(input: { from: string; to: string; status?: number }): Promise<RedirectRule> {
  const from = normalizePath(input.from)
  const to = input.to.startsWith('http') ? input.to : normalizePath(input.to) || '/'
  const status = input.status === 302 ? 302 : 301
  if (isMysqlConfigured()) return mysqlInsertDoc<RedirectRule>('redirect', { from, to, status, published: true, slug: from })
  await ensureIndexes()
  const now = new Date()
  const doc = { from, to, status, createdAt: now, updatedAt: now }
  const collection = await getCollection<WithDates<RedirectRule>>('redirects')
  const result = await collection.insertOne(doc)
  return serializeRedirect({ ...doc, _id: result.insertedId } as WithDates<RedirectRule> & { _id: ObjectId })
}

export async function updateRedirect(id: string, input: Partial<RedirectRule>): Promise<RedirectRule | null> {
  if (isMysqlConfigured()) {
    const existing = await getRedirectById(id)
    if (!existing) return null
    return mysqlUpdateDoc<RedirectRule>('redirect', id, {
      from: input.from !== undefined ? normalizePath(input.from) : existing.from,
      to: input.to !== undefined ? (input.to.startsWith('http') ? input.to : normalizePath(input.to) || '/') : existing.to,
      status: input.status !== undefined ? (input.status === 302 ? 302 : 301) : existing.status,
    })
  }
  if (!ObjectId.isValid(id)) return null
  const $set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.from !== undefined) $set.from = normalizePath(input.from)
  if (input.to !== undefined) $set.to = input.to.startsWith('http') ? input.to : normalizePath(input.to) || '/'
  if (input.status !== undefined) $set.status = input.status === 302 ? 302 : 301
  await (await getCollection('redirects')).updateOne({ _id: new ObjectId(id) }, { $set })
  return getRedirectById(id)
}

export async function deleteRedirect(id: string): Promise<RedirectRule | null> {
  if (isMysqlConfigured()) return mysqlDeleteDoc<RedirectRule>('redirect', id)
  const existing = await getRedirectById(id)
  if (!existing) return null
  await (await getCollection('redirects')).deleteOne({ _id: new ObjectId(id) })
  return existing
}

export async function resolveRedirect(pathname: string): Promise<{ to: string; status: number } | null> {
  const path = normalizePath(pathname)
  if (!path || path === '/') return null
  if (path === '/json' || path.startsWith('/json/')) return null
  if (path.startsWith('/product-category/')) {
    return { to: `/category/${path.slice('/product-category/'.length)}`, status: 301 }
  }
  if (path.startsWith('/product-tag/')) {
    return { to: '/products', status: 301 }
  }
  const mapped = await getRedirectByFrom(path).catch(() => null)
  if (mapped) return { to: mapped.to, status: mapped.status }
  return null
}

function serializeProfilePage(doc: WithDates<CompanyProfilePage> & { _id: ObjectId }): CompanyProfilePage {
  return {
    _id: String(doc._id),
    title: doc.title || '',
    body: doc.body || '',
    image: doc.image || null,
    order: Number(doc.order) || 0,
    published: Boolean(doc.published),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

export async function listCompanyProfilePages(publishedOnly = false): Promise<CompanyProfilePage[]> {
  if (isMysqlConfigured()) return mysqlListProfilePages(publishedOnly)
  if (!isMongoConfigured()) return []
  await ensureIndexes()
  const collection = await getCollection<WithDates<CompanyProfilePage>>('company_profile_pages')
  const filter = publishedOnly ? { published: true } : {}
  const docs = await collection.find(filter).sort({ order: 1, createdAt: 1 }).toArray()
  return docs.map((doc) => serializeProfilePage(doc as WithDates<CompanyProfilePage> & { _id: ObjectId }))
}

export async function getCompanyProfilePageById(id: string): Promise<CompanyProfilePage | null> {
  if (isMysqlConfigured()) return mysqlGetDoc<CompanyProfilePage>('company-profile', id)
  if (!isMongoConfigured() || !ObjectId.isValid(id)) return null
  const collection = await getCollection<WithDates<CompanyProfilePage>>('company_profile_pages')
  const doc = await collection.findOne({ _id: new ObjectId(id) })
  return doc ? serializeProfilePage(doc as WithDates<CompanyProfilePage> & { _id: ObjectId }) : null
}

export async function createCompanyProfilePage(
  input: Omit<CompanyProfilePage, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<CompanyProfilePage> {
  const existing = await listCompanyProfilePages(false)
  const order = input.order > 0 ? input.order : existing.length + 1
  if (isMysqlConfigured()) {
    return mysqlInsertDoc<CompanyProfilePage>('company-profile', {
      title: input.title,
      body: input.body || '',
      image: input.image || null,
      order,
      published: Boolean(input.published),
    })
  }
  await ensureIndexes()
  const now = new Date()
  const doc = {
    title: input.title,
    body: input.body || '',
    image: input.image || null,
    order,
    published: Boolean(input.published),
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCollection<WithDates<CompanyProfilePage>>('company_profile_pages')
  const result = await collection.insertOne(doc)
  return serializeProfilePage({ ...doc, _id: result.insertedId } as WithDates<CompanyProfilePage> & { _id: ObjectId })
}

export async function updateCompanyProfilePage(id: string, input: Partial<CompanyProfilePage>): Promise<CompanyProfilePage | null> {
  if (isMysqlConfigured()) return mysqlUpdateDoc<CompanyProfilePage>('company-profile', id, input)
  if (!ObjectId.isValid(id)) return null
  const $set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) $set.title = input.title
  if (input.body !== undefined) $set.body = input.body
  if (input.image !== undefined) $set.image = input.image
  if (input.order !== undefined) $set.order = input.order
  if (input.published !== undefined) $set.published = input.published
  await (await getCollection('company_profile_pages')).updateOne({ _id: new ObjectId(id) }, { $set })
  return getCompanyProfilePageById(id)
}

export async function deleteCompanyProfilePage(id: string): Promise<CompanyProfilePage | null> {
  const existing = await getCompanyProfilePageById(id)
  if (!existing) return null
  if (isMysqlConfigured()) {
    await mysqlDeleteDoc<CompanyProfilePage>('company-profile', id)
  } else {
    await (await getCollection('company_profile_pages')).deleteOne({ _id: new ObjectId(id) })
  }
  if (existing.image?.publicId?.startsWith('mysql:')) {
    await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
  }
  return existing
}

async function storeProfilePageImage(buffer: Buffer, filename: string, index: number): Promise<MediaAsset> {
  const prepared = await prepareStoredImage(buffer, filename, 'image/jpeg')
  if (isMysqlConfigured()) {
    return mysqlSaveFile({
      kind: 'profile',
      ownerKey: `company-profile/${index}`,
      filename: prepared.filename,
      mime: prepared.mime,
      buffer: prepared.buffer,
    })
  }
  if (!isCloudinaryConfigured()) throw new Error('Image storage is not configured')
  const uploaded = await uploadSiteImage(prepared.buffer, 'tarumed/profile', `pdf-${index}`)
  return { publicId: uploaded.public_id, secureUrl: uploaded.secure_url }
}

export async function replaceCompanyProfileFromPdf(pdf: Buffer, filename: string): Promise<CompanyProfilePage[]> {
  const rendered = await renderPdfPages(pdf)
  const existing = await listCompanyProfilePages(false)
  for (const page of existing) await deleteCompanyProfilePage(page._id)
  const pages: CompanyProfilePage[] = []
  for (let index = 0; index < rendered.length; index += 1) {
    const image = await storeProfilePageImage(rendered[index].buffer, rendered[index].filename || `${filename}-${index + 1}.jpg`, index + 1)
    pages.push(await createCompanyProfilePage({
      title: index === 0 ? 'Cover' : `Page ${index + 1}`,
      body: '',
      image,
      order: index + 1,
      published: true,
    }))
  }
  return pages
}
