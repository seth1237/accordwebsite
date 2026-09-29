import 'server-only'

import { ACCORD_CATALOG_URL, ACCORD_SHOP_URL, fetchAccordProducts } from '@/lib/accord-shop'
import {
  mysqlCatalogImportStats,
  mysqlCatalogProductIds,
  mysqlProductHasDetails,
  mysqlIsLocalCatalogReady,
  mysqlListSourceUrls,
  mysqlSaveFile,
  mysqlSetLocalCatalogReady,
  mysqlUpdateProductDetails,
  mysqlUpsertCatalogProduct,
} from '@/lib/mysql'

const IMAGE_MAX_BYTES = 8 * 1024 * 1024

export type CatalogImportBatchResult = {
  source: string
  total: number
  processed: number
  productsSaved: number
  imagesSaved: number
  imagesSkipped: number
  remaining: number
  done: boolean
  errors: string[]
  stats: { products: number; importedImages: number; storedImages: number }
}

function absoluteUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  try {
    return new URL(url, ACCORD_SHOP_URL).toString()
  } catch {
    return ''
  }
}

function filenameFromUrl(url: string) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
    return (name || 'product.jpg').replace(/[^\w.-]+/g, '-').slice(0, 180)
  } catch {
    return 'product.jpg'
  }
}

async function downloadImage(url: string) {
  const absolute = absoluteUrl(url)
  if (!absolute) return null
  const response = await fetch(absolute, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'AccordWebsite/1.0',
      Accept: 'image/*,*/*',
    },
  })
  if (!response.ok) return null
  const mime = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  if (!mime.startsWith('image/')) return null
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length || buffer.length > IMAGE_MAX_BYTES) return null
  return { buffer, mime, filename: filenameFromUrl(absolute), sourceUrl: absolute }
}

export async function importCatalogBatch(limit = 6): Promise<CatalogImportBatchResult> {
  const source = process.env.CATALOG_SOURCE_URL || ACCORD_CATALOG_URL
  const remote = await fetchAccordProducts()
  const existingIds = await mysqlCatalogProductIds()
  const errors: string[] = []
  let processed = 0
  let productsSaved = 0
  let imagesSaved = 0
  let imagesSkipped = 0
  let remaining = 0

  for (const product of remote) {
    const savedUrls = await mysqlListSourceUrls(product.id)
    const pending = product.images.map(absoluteUrl).filter((url) => url && !savedUrls.has(url))
    const missingRow = !existingIds.has(product.id)
    if (!missingRow && !pending.length) continue
    if (processed >= limit) {
      remaining += 1
      continue
    }

    processed += 1
    try {
      await mysqlUpsertCatalogProduct(product)
      productsSaved += 1
      existingIds.add(product.id)
      const hasDetails = await mysqlProductHasDetails(product.id).catch(() => false)
      if (!hasDetails && product.details) {
        await mysqlUpdateProductDetails(product.id, product.details, {
          distributedFor: product.distributedFor || '',
        })
      }
      for (const url of pending) {
        try {
          const image = await downloadImage(url)
          if (!image) {
            imagesSkipped += 1
            continue
          }
          await mysqlSaveFile({
            kind: 'product-image',
            ownerKey: product.id,
            filename: image.filename,
            mime: image.mime,
            buffer: image.buffer,
            sourceUrl: image.sourceUrl,
          })
          imagesSaved += 1
        } catch (error) {
          imagesSkipped += 1
          errors.push(`${product.slug}: ${error instanceof Error ? error.message : 'image save failed'}`)
        }
      }
    } catch (error) {
      errors.push(`${product.slug}: ${error instanceof Error ? error.message : 'product save failed'}`)
    }
  }

  const stats = await mysqlCatalogImportStats()
  const done = processed === 0 && remaining === 0
  if (stats.products >= remote.length && remote.length > 0) {
    await mysqlSetLocalCatalogReady(true)
  }
  return {
    source,
    total: remote.length,
    processed,
    productsSaved,
    imagesSaved,
    imagesSkipped,
    remaining,
    done,
    errors: errors.slice(0, 12),
    stats,
  }
}

export async function catalogImportStatus() {
  const stats = await mysqlCatalogImportStats()
  const ready = await mysqlIsLocalCatalogReady().catch(() => false)
  return {
    source: process.env.CATALOG_SOURCE_URL || ACCORD_CATALOG_URL,
    usingLocalCatalog: ready && stats.products > 0 && process.env.CATALOG_SOURCE !== 'remote',
    stats,
  }
}
