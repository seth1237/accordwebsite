import type { Metadata } from 'next'
import { categoryHref, productCategoryHref, productHref, type CatalogProduct } from '@/lib/catalog'
import { ROUTES } from '@/lib/routes'
import { socialProfileUrls, TWITTER_HANDLE } from '@/lib/socials'
import { COMPANY } from '@/lib/utils'

export const DEFAULT_TITLE = 'Accord Medical Supplies Ltd | Medical Equipment Supplier in Kenya'
export const DEFAULT_DESCRIPTION =
  'Accord Medical Supplies Ltd supplies medical equipment, laboratory analysers, hospital furniture and diagnostic products to hospitals and clinics in Kenya. Eldoret office, Nairobi warehouse.'

export function absoluteUrl(path = '/') {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return suffix === '/' ? COMPANY.url : `${COMPANY.url}${suffix}`
}

export function truncateMeta(text: string, max = 158) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  imageType,
  index = true,
  absoluteTitle = false,
  type = 'website',
  keywords,
}: {
  title: string
  description: string
  path: string
  image?: string
  imageType?: string
  index?: boolean
  absoluteTitle?: boolean
  type?: 'website' | 'article'
  keywords?: string[]
}): Metadata {
  const url = absoluteUrl(path)
  const desc = truncateMeta(description)
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl(COMPANY.logo)
  const ogImages = image
    ? [{ url: ogImage, alt: title, width: 1200, height: 630, type: imageType || 'image/jpeg' }]
    : [{ url: ogImage, alt: title, width: 1024, height: 341 }]
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: COMPANY.name,
      locale: 'en_KE',
      type,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      site: `@${TWITTER_HANDLE}`,
      creator: `@${TWITTER_HANDLE}`,
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

export type CategorySeo = {
  title: string
  description: string
  h1: string
  lede: string
  heading: string
}

/** Copy mapped from 12-month Search Console queries already sending this site impressions. */
export const CATEGORY_SEO: Record<string, CategorySeo> = {
  laboratory: {
    title: 'Laboratory Equipment for Hospitals in Kenya',
    description:
      'Hematology, dry chemistry, coagulation and clinical chemistry analysers for hospital laboratories in Kenya. Request a quote from Accord Medical Supplies.',
    h1: 'Laboratory equipment',
    lede: 'Analysers and lab instruments used in Kenyan hospital and clinic laboratories, from hematology and chemistry to coagulation.',
    heading: 'Hematology, chemistry and coagulation',
  },
  'diagnostic-products': {
    title: 'Diagnostic Products & Analysers',
    description:
      'Diagnostic analysers and point-of-care equipment for Kenyan laboratories, including immunoassay, blood gas and clinical chemistry systems.',
    h1: 'Diagnostic products',
    lede: 'Immunoassay, blood gas and chemistry systems used by hospital laboratories across Kenya.',
    heading: 'Diagnostic systems in the catalogue',
  },
  furniture: {
    title: 'Hospital Furniture | Beds, Overbed Tables & Cabinets',
    description:
      'Hospital beds, overbed tables, bedside cabinets and ward furniture supplied to facilities in Kenya. Request a quote from Accord Medical Supplies.',
    h1: 'Hospital furniture',
    lede: 'Beds, overbed tables, cabinets and ward furniture for hospitals and clinics.',
    heading: 'Beds, tables and ward furniture',
  },
  maternity: {
    title: 'Maternity Equipment | Delivery Beds & Newborn Care',
    description:
      'Electric delivery beds, obstetric couches, baby incubators and infant warmers for maternity units in Kenya.',
    h1: 'Maternity equipment',
    lede: 'Delivery beds, obstetric couches and newborn-care equipment for maternity wards.',
    heading: 'Delivery and newborn care',
  },
  'theatre-intensive-care-unit': {
    title: 'Theatre & ICU Equipment',
    description:
      'Operating tables, patient monitors, suction units and intensive care equipment for theatre and ICU departments in Kenya.',
    h1: 'Theatre and ICU equipment',
    lede: 'Operating tables, monitors, suction and critical-care equipment for theatre and intensive care.',
    heading: 'Theatre, ICU and critical care',
  },
  'medical-training-materials': {
    title: 'Medical Training Manikins & CPR Models',
    description:
      'Adult CPR manikins, nursing manikins and clinical training models for medical schools and hospital training programmes in Kenya.',
    h1: 'Medical training materials',
    lede: 'CPR and nursing manikins used by training schools and hospital education teams.',
    heading: 'Manikins and training models',
  },
  homecare: {
    title: 'Homecare Equipment & Mobility Aids',
    description:
      'Wheelchairs, walking frames, crutches and home-care equipment supplied to patients and facilities in Kenya.',
    h1: 'Homecare equipment',
    lede: 'Mobility aids and home-care equipment for patients and outpatient programmes.',
    heading: 'Mobility and home care',
  },
  imaging: {
    title: 'Imaging Equipment | Ultrasound & X-ray',
    description:
      'Ultrasound machines, C-arm and digital X-ray systems for hospitals and diagnostic centres in Kenya.',
    h1: 'Imaging equipment',
    lede: 'Ultrasound, C-arm and X-ray systems for imaging departments.',
    heading: 'Ultrasound and X-ray',
  },
  renal: {
    title: 'Renal Equipment | Dialysis Chairs',
    description:
      'Electric dialysis chairs and renal-care equipment for dialysis units in Kenya.',
    h1: 'Renal equipment',
    lede: 'Dialysis chairs and related equipment for renal units.',
    heading: 'Dialysis and renal care',
  },
  cssd: {
    title: 'CSSD & Sterilization Equipment',
    description:
      'Central sterile supply equipment for hospital CSSD departments in Kenya.',
    h1: 'CSSD equipment',
    lede: 'Sterilization and central sterile supply equipment for hospital CSSD teams.',
    heading: 'Sterile supply',
  },
  dental: {
    title: 'Dental Equipment | Chairs & X-ray',
    description:
      'Dental chairs, dental X-ray units and clinic equipment for Kenyan dental practices.',
    h1: 'Dental equipment',
    lede: 'Chairs, X-ray units and clinic equipment for dental practices.',
    heading: 'Dental chairs and imaging',
  },
  'cold-chain': {
    title: 'Medical Cold Chain | Fridges & Freezers',
    description:
      'Blood bank refrigerators, medical freezers and cold-chain storage for laboratories and pharmacies in Kenya.',
    h1: 'Cold chain equipment',
    lede: 'Medical refrigerators and freezers for blood banks, pharmacies and laboratories.',
    heading: 'Fridges, freezers and blood storage',
  },
  engineering: {
    title: 'Biomedical Engineering Equipment',
    description:
      'Biomedical engineering tools and support equipment from Accord Medical Supplies in Kenya.',
    h1: 'Engineering equipment',
    lede: 'Tools and equipment used by biomedical engineering teams.',
    heading: 'Biomedical engineering',
  },
}

export function categorySeo(slug: string, name: string): CategorySeo {
  return (
    CATEGORY_SEO[slug] || {
      title: `${name} | Medical Equipment Kenya`,
      description: `${name} from Accord Medical Supplies Ltd for hospitals and clinics in Kenya. Browse the catalogue and request a quote.`,
      h1: name,
      lede: `${name} currently listed for hospitals and clinics in Kenya.`,
      heading: `Products in ${name}`,
    }
  )
}

export function productMetaDescription(product: CatalogProduct) {
  if (product.seo?.seoDescription) return truncateMeta(product.seo.seoDescription)
  if (product.description) return truncateMeta(product.description)
  const brand = product.manufacturer ? `${product.manufacturer} ` : ''
  const category = product.categoryName || 'medical equipment'
  return truncateMeta(
    `${brand}${product.name} from Accord Medical Supplies. ${category} for hospitals and clinics in Kenya. Request a quote.`,
  )
}

export function productImageAlt(product: Pick<CatalogProduct, 'name' | 'categoryName' | 'seo'>, index?: number) {
  if (product.seo?.imageAlt) {
    return typeof index === 'number' && index > 0 ? `${product.seo.imageAlt}, photo ${index + 1}` : product.seo.imageAlt
  }
  const category = product.categoryName ? ` — ${product.categoryName}` : ''
  if (typeof index === 'number' && index > 0) return `${product.name}${category}, photo ${index + 1}`
  return `${product.name}${category}`
}

export type BreadcrumbCrumb = { name: string; path: string }

function breadcrumbItemUrl(path: string) {
  return path === '/' ? `${COMPANY.url}/` : absoluteUrl(path)
}

function withoutContext<T extends Record<string, unknown>>(node: T) {
  const { '@context': _context, ...rest } = node
  return rest
}

/** Visible trail and JSON-LD share this path: Home › Products › category › product. */
export function productBreadcrumbItems(
  product: Pick<CatalogProduct, 'name' | 'slug' | 'id' | 'categoryId' | 'categoryName'>,
): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: ROUTES.products },
  ]
  if (product.categoryName) {
    crumbs.push({ name: product.categoryName, path: productCategoryHref(product) })
  }
  crumbs.push({ name: product.name, path: productHref(product) })
  return crumbs
}

export function breadcrumbJsonLd(items: BreadcrumbCrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: breadcrumbItemUrl(crumb.path),
    })),
  }
}

export function productJsonLd(product: CatalogProduct, showPrices: boolean) {
  const url = absoluteUrl(productHref(product))
  const images = (product.images.length ? product.images : [product.image]).filter(Boolean) as string[]
  const imageUrls = (images.length ? images : [COMPANY.logo]).map((src) => (src.startsWith('http') ? src : absoluteUrl(src)))
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'KES',
    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      '@id': `${COMPANY.url}/#organization`,
      name: COMPANY.name,
      url: COMPANY.url,
    },
    itemCondition: 'https://schema.org/NewCondition',
  }
  if (showPrices && product.price > 0) offer.price = product.price
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: productMetaDescription(product),
    sku: product.id,
    image: imageUrls,
    brand: {
      '@type': 'Brand',
      name: product.manufacturer || COMPANY.name,
    },
    url,
    mainEntityOfPage: url,
    offers: offer,
  }
  if (product.categoryName) node.category = product.categoryName
  if (product.manufacturer) {
    node.manufacturer = { '@type': 'Organization', name: product.manufacturer }
  }
  return node
}

/** Product template graph. Organization / LocalBusiness is emitted once in the root layout. */
export function productPageJsonLd(product: CatalogProduct, showPrices: boolean) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      withoutContext(productJsonLd(product, showPrices)),
      withoutContext(breadcrumbJsonLd(productBreadcrumbItems(product))),
    ],
  }
}

export function articleJsonLd(input: { title: string; description: string; path: string; date: string; image?: string }) {
  const image = input.image
    ? input.image.startsWith('http')
      ? input.image
      : absoluteUrl(input.image)
    : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    datePublished: input.date,
    image: image ? [image] : undefined,
    author: { '@type': 'Organization', name: COMPANY.name, url: COMPANY.url },
    publisher: { '@id': `${COMPANY.url}/#organization` },
    mainEntityOfPage: absoluteUrl(input.path),
  }
}

export function organizationJsonLd() {
  const eldoret = {
    '@type': 'PostalAddress',
    streetAddress: 'Aico Plaza, second floor, room number 8',
    addressLocality: 'Eldoret',
    addressRegion: 'Uasin Gishu',
    addressCountry: 'KE',
  }
  const nairobi = {
    '@type': 'PostalAddress',
    streetAddress: 'Unicorn Sales & Services Godowns, Warehouse No. 16, Baba Dogo Road',
    addressLocality: 'Nairobi',
    addressCountry: 'KE',
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'MedicalBusiness', 'LocalBusiness'],
        '@id': `${COMPANY.url}/#organization`,
        name: COMPANY.name,
        legalName: COMPANY.name,
        alternateName: ['Accord Medical Supplies', 'Accord Medical Supplies Limited', 'Accord Medical'],
        url: COMPANY.url,
        logo: absoluteUrl(COMPANY.logo),
        image: absoluteUrl(COMPANY.logo),
        email: COMPANY.email,
        telephone: [COMPANY.phone, COMPANY.phoneSecondary],
        sameAs: socialProfileUrls(),
        description: DEFAULT_DESCRIPTION,
        foundingLocation: eldoret,
        address: [eldoret, nairobi],
        areaServed: { '@type': 'Country', name: 'Kenya' },
        openingHours: ['Mo-Fr 08:00-17:00', 'Sa 09:00-12:00'],
        priceRange: '$$',
        department: [
          {
            '@type': 'LocalBusiness',
            name: `${COMPANY.shortName} Eldoret office`,
            address: eldoret,
            telephone: COMPANY.phone,
          },
          {
            '@type': 'LocalBusiness',
            name: `${COMPANY.shortName} Nairobi warehouse`,
            address: nairobi,
            telephone: COMPANY.phoneSecondary,
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${COMPANY.url}/#website`,
        url: COMPANY.url,
        name: COMPANY.name,
        inLanguage: 'en-KE',
        publisher: { '@id': `${COMPANY.url}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${COMPANY.url}/products?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

export const HOME_TOPIC_LINKS = [
  { href: '/category/laboratory', label: 'Laboratory' },
  { href: '/category/diagnostic-products', label: 'Diagnostics' },
  { href: '/category/furniture', label: 'Hospital furniture' },
  { href: '/category/maternity', label: 'Maternity' },
  { href: '/category/theatre-intensive-care-unit', label: 'Theatre & ICU' },
  { href: '/category/medical-training-materials', label: 'Training manikins' },
  { href: '/biomedical-engineering-services.html', label: 'Biomedical services' },
] as const

export function relatedCategoryLinks(slug: string) {
  return HOME_TOPIC_LINKS.filter((link) => link.href !== categoryHref({ slug }))
}
