import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'

function loadSharp() {
  const roots = [process.cwd(), path.resolve(process.cwd(), '..')]
  for (const root of roots) {
    const pkg = path.join(root, 'package.json')
    if (!existsSync(pkg)) continue
    try {
      return createRequire(pkg)('sharp') as typeof import('sharp')
    } catch {
      continue
    }
  }
  throw new Error('sharp is not installed')
}

export async function imageToWebp(buffer: Buffer, maxEdge = 1920) {
  const sharp = loadSharp()
  return sharp(buffer, { failOn: 'none', animated: false })
    .rotate()
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
}

export function isSvgImage(filename: string, mime: string) {
  return mime === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg')
}

export async function prepareStoredImage(buffer: Buffer, filename: string, mime: string) {
  if (isSvgImage(filename, mime)) {
    return { buffer, filename, mime: 'image/svg+xml' }
  }
  const webp = await imageToWebp(buffer)
  const base = filename.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-') || 'image'
  return { buffer: webp, filename: `${base}.webp`, mime: 'image/webp' as const }
}
