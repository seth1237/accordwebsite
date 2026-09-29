import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Catalog } from '@/lib/catalog'

const cacheFile = path.join(process.cwd(), '.cache', 'catalog.json')

let memory: Catalog | null = null

export function rememberCatalog(catalog: Catalog) {
  if (catalog.products.length) memory = catalog
}

export function lastCatalog(): Catalog | null {
  return memory
}

export async function readDevCatalogCache(): Promise<Catalog | null> {
  if (process.env.NODE_ENV === 'production') return memory
  if (memory?.products.length) return memory
  try {
    const data = JSON.parse(await readFile(cacheFile, 'utf8')) as Catalog
    if (Array.isArray(data?.products) && data.products.length) {
      memory = data
      return data
    }
  } catch {}
  return null
}

export async function writeDevCatalogCache(catalog: Catalog) {
  rememberCatalog(catalog)
  if (process.env.NODE_ENV === 'production' || !catalog.products.length) return
  try {
    await mkdir(path.dirname(cacheFile), { recursive: true })
    await writeFile(cacheFile, JSON.stringify(catalog))
  } catch {}
}
