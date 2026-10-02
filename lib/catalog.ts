export const PLACEHOLDER_IMAGE = '/product-placeholder.svg'
export const ACCORD_QUOTE_URL = '/customer-request/get-quote'
export const ACCORD_SHOP_ORIGIN = 'https://accordmedical.co.ke'

export type ShopImage = {
  product_image?: string
  product_image_md?: string
}

export type ShopItem = {
  id: number
  product_name?: string
  product_slug?: string
  product_type?: string | null
  product_description?: string
  product_price?: string
  product_reduced_price?: string
  featured?: number
  item_brand_manufacturer?: string | null
  created_on?: string
  country?: string
  city?: string
  category?: string | null
  images?: ShopImage[]
}

export type CatalogProduct = {
  id: string
  name: string
  description: string
  details: string
  categoryId: string
  categoryName: string
  price: number
  compareAt?: number
  unit: string
  stock: number
  inStock: boolean
  image: string | null
  images: string[]
  imageAssets: Array<{ publicId: string; secureUrl: string; installation?: boolean }>
  manufacturer?: string
  distributedFor?: string
  clicks: number
  shares: number
  slug: string
  shopUrl: string
  productType?: string | null
  featured: boolean
  createdOn?: string
}

export type CatalogCategory = {
  _id: string
  name: string
  slug: string
  count: number
  description?: string
}

export type Catalog = {
  products: CatalogProduct[]
  categories: CatalogCategory[]
}

export type NavProduct = { id: string; name: string; slug: string }

export type SearchProduct = {
  id: string
  name: string
  slug: string
  categoryName: string
  manufacturer?: string
  productType?: string | null
  description?: string
}

export type NavCategory = {
  id: string
  name: string
  slug: string
  count: number
  products: NavProduct[]
}

const HOME_MIX = ['Laboratory Equipment', 'Imaging Equipment', 'Maternity Equipment']

export function categorySlug(category: string | null | undefined) {
  return String(category || 'uncategorized')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Live accordmedical.co.ke category paths, keyed by our generated name slugs. */
const LIVE_CATEGORY_SLUGS: Record<string, string> = {
  'hospital-furniture': 'furniture',
  'homecare-equipment': 'homecare',
  'laboratory-equipment': 'laboratory',
  'maternity-equipment': 'maternity',
  'theatre-and-intensive-care-unit-icu-equipment': 'theatre-intensive-care-unit',
  'imaging-equipment': 'imaging',
  'renal-equipment': 'renal',
  'dental-equipment': 'dental',
}

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  ...LIVE_CATEGORY_SLUGS,
  'hosptital-furniture': 'furniture',
  'operating-theatre-equipment': 'theatre-intensive-care-unit',
  'theatre-and-intensive-care-unit-icu-equipment': 'theatre-intensive-care-unit',
  'hospital-furniture': 'furniture',
  'laboratory-equipment': 'laboratory',
  'maternity-equipment': 'maternity',
  'imaging-equipment': 'imaging',
  'renal-equipment': 'renal',
  'dental-equipment': 'dental',
  'homecare-equipment': 'homecare',
}

export function publicCategorySlug(nameOrSlug: string) {
  const generated = categorySlug(nameOrSlug)
  return LIVE_CATEGORY_SLUGS[generated] || generated
}

export function resolveCategorySlug(slug: string) {
  const key = decodeURIComponent(slug).trim()
  return CATEGORY_SLUG_ALIASES[key] || key
}

export function stripHtml(html: string | null | undefined) {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeHtml(html: string | null | undefined) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

export function toProduct(p: ShopItem): CatalogProduct | null {
  const name = String(p.product_name || '').trim()
  const slug = String(p.product_slug || '').trim()
  if (!p.id || !name || !slug) return null
  const price = Number(p.product_price)
  const sale = Number(p.product_reduced_price)
  const images = (p.images || [])
    .map((image) => image.product_image)
    .filter((url): url is string => Boolean(url))
  const category = String(p.category || '').trim() || 'Uncategorized'
  const brand = String(p.item_brand_manufacturer || '').trim() || undefined
  const type = p.product_type && p.product_type !== 'Other' ? p.product_type : null
  const descriptionHtml = sanitizeHtml(p.product_description || '')
  const descriptionText = stripHtml(p.product_description)
  const slugCat = publicCategorySlug(category)
  return {
    id: String(p.id),
    name,
    description: descriptionText,
    details: descriptionHtml,
    categoryId: slugCat,
    categoryName: category,
    price: Number.isFinite(price) && price > 0 ? price : 0,
    compareAt: Number.isFinite(sale) && sale > 0 ? sale : undefined,
    unit: 'unit',
    stock: 0,
    inStock: true,
    image: images[0] || null,
    images,
    imageAssets: [],
    manufacturer: brand,
    clicks: 0,
    shares: 0,
    slug,
    shopUrl: `${ACCORD_SHOP_ORIGIN}/product/${slug}`,
    productType: type,
    featured: p.featured === 1,
    createdOn: p.created_on,
  }
}

export function mergeOverlay(product: CatalogProduct, content?: {
  details?: string
  images?: Array<{ publicId?: string; secureUrl?: string; installation?: boolean }>
  distributedFor?: string
} | null): CatalogProduct {
  if (!content) return product
  const extraAssets = (content.images || []).filter((image): image is { publicId: string; secureUrl: string; installation?: boolean } => Boolean(image.secureUrl && image.publicId))
  const extraUrls = extraAssets.map((image) => image.secureUrl)
  const shopUrls = product.images.filter((url) => url && !extraUrls.includes(url))
  const cardUrl = extraAssets.find((image) => !image.installation)?.secureUrl || shopUrls[0] || null
  const images = [...extraUrls, ...shopUrls].filter((url, index, list) => url && list.indexOf(url) === index)
  const overlayDetails = String(content.details || '').trim()
  return {
    ...product,
    images,
    image: cardUrl || product.image,
    imageAssets: extraAssets,
    details: overlayDetails || product.details,
    description: product.description || stripHtml(overlayDetails),
    distributedFor: String(content.distributedFor || '').trim() || product.distributedFor,
  }
}

export function buildNavCategories(catalog: Catalog, productLimit = 0): NavCategory[] {
  return catalog.categories
    .filter((category) => category.count > 0)
    .map((category) => {
      const products = catalog.products
        .filter((product) => publicCategorySlug(product.categoryName) === category.slug || product.categoryId === category._id)
        .map((product) => ({ id: product.id, name: product.name, slug: product.slug }))
      return {
        id: category._id,
        name: category.name,
        slug: category.slug,
        count: category.count,
        products: productLimit > 0 ? products.slice(0, productLimit) : products,
      }
    })
}

export function categoriesFromProducts(products: CatalogProduct[]): CatalogCategory[] {
  const counts = new Map<string, CatalogCategory>()
  for (const product of products) {
    const slug = publicCategorySlug(product.categoryName || product.categoryId)
    const existing = counts.get(slug)
    if (existing) existing.count += 1
    else counts.set(slug, { _id: slug, name: product.categoryName, slug, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function mergeCatalogCategories(stored: CatalogCategory[], fromProducts: CatalogCategory[]): CatalogCategory[] {
  const map = new Map<string, CatalogCategory>()
  for (const category of stored) {
    const slug = category.slug || publicCategorySlug(category.name) || category._id
    map.set(slug, { ...category, _id: slug, slug, count: 0 })
  }
  for (const category of fromProducts) {
    const existing = map.get(category.slug)
    if (existing) {
      existing.count = category.count
      if (!existing.name) existing.name = category.name
    } else {
      map.set(category.slug, category)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function homepageProducts(products: CatalogProduct[], limit = 6): CatalogProduct[] {
  const picked: CatalogProduct[] = []
  const seen = new Set<string>()

  function take(list: CatalogProduct[]) {
    for (const product of list) {
      if (picked.length >= limit) return
      if (seen.has(product.id)) continue
      seen.add(product.id)
      picked.push(product)
    }
  }

  take(products.filter((product) => product.featured))
  const buckets = HOME_MIX.map((name) => products.filter((product) => product.categoryName === name && !seen.has(product.id)))
  let index = 0
  while (picked.length < limit && buckets.some((bucket) => bucket.length)) {
    const next = buckets[index % buckets.length].shift()
    if (next && !seen.has(next.id)) {
      seen.add(next.id)
      picked.push(next)
    }
    index += 1
    if (index > 200) break
  }
  take(products)
  return picked
}

export function formatKes(amount: number) {
  if (!amount) return 'Request a quote'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function displayPrice(product: Pick<CatalogProduct, 'price'>, showPrices = true) {
  if (!showPrices || !product.price) return 'Request a quote'
  return formatKes(product.price)
}

export function slugifyName(name: string) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function assignSlugs(products: CatalogProduct[]): CatalogProduct[] {
  const used = new Set<string>()
  return products.map((product) => {
    let slug = product.slug || slugifyName(product.name) || `product-${product.id.slice(-6)}`
    if (used.has(slug)) slug = `${slug}-${product.id.slice(-6)}`
    used.add(slug)
    return { ...product, slug }
  })
}

export function productHref(product: Pick<CatalogProduct, 'slug' | 'id'>) {
  return `/product/${product.slug || product.id}`
}

export function categoryHref(category: { slug?: string; name?: string; id?: string; _id?: string }) {
  const slug = category.slug || publicCategorySlug(category.name || '') || category.id || category._id || 'uncategorized'
  return `/category/${slug}`
}

export function assignCategorySlugs<T extends { _id: string; name: string; slug?: string }>(categories: T[]): Array<T & { slug: string }> {
  const used = new Set<string>()
  return categories.map((category) => {
    let slug = category.slug || publicCategorySlug(category.name) || category._id
    if (used.has(slug)) slug = `${slug}-${category._id.slice(-6)}`
    used.add(slug)
    return { ...category, slug }
  })
}

export function isProductObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value)
}

export function productImageSrc(product: Pick<CatalogProduct, 'image' | 'images' | 'imageAssets'>) {
  const installationUrls = new Set(
    (product.imageAssets || []).filter((asset) => asset.installation).map((asset) => asset.secureUrl),
  )
  if (product.image && !installationUrls.has(product.image)) return product.image
  const extraPhoto = product.imageAssets?.find((asset) => !asset.installation)?.secureUrl
  if (extraPhoto) return extraPhoto
  const shopPhoto = product.images.find((url) => url && !installationUrls.has(url))
  return shopPhoto || PLACEHOLDER_IMAGE
}

export function productSearchText(product: Pick<CatalogProduct, 'name' | 'categoryName' | 'manufacturer' | 'productType' | 'description'>) {
  return [product.name, product.categoryName, product.manufacturer, product.productType, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
