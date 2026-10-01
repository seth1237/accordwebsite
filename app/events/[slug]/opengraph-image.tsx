import { accordApiPath } from '@/lib/backend-url'
import type { MediaAsset } from '@/lib/content'
import { eventPoster } from '@/lib/event-body'
import { imageToOgJpeg } from '@/lib/image-convert'
import { isMysqlConfigured, mysqlFileIdFromPublicId, mysqlGetFile } from '@/lib/mysql'
import { getEventBySlug } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Event'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'
export const revalidate = 3600

async function loadPosterBuffer(image: MediaAsset) {
  const fileId = mysqlFileIdFromPublicId(image.publicId)
  if (fileId && isMysqlConfigured()) {
    const file = await mysqlGetFile(fileId).catch(() => null)
    if (file?.data?.length) return file.data
  }
  const src = image.secureUrl
  if (!src) return null
  const url = src.startsWith('http') ? src : accordApiPath(src)
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  if (!response.ok) return null
  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer.length ? buffer : null
}

function jpegResponse(buffer: Buffer) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

async function fallbackCard(title: string) {
  const png = await new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 64,
          background: '#0b1220',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: '#7fd3d0' }}>Event</div>
        <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 700, marginTop: 16 }}>{title}</div>
        <div style={{ fontSize: 22, marginTop: 24, color: '#9db9b7' }}>{COMPANY.name}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  ).arrayBuffer()
  return jpegResponse(await imageToOgJpeg(Buffer.from(png)))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await getEventBySlug(slug).catch(() => null)
  if (!item || !item.published) return fallbackCard(COMPANY.name)
  const poster = eventPoster(item)
  if (poster) {
    const raw = await loadPosterBuffer(poster).catch(() => null)
    if (raw) return jpegResponse(await imageToOgJpeg(raw))
  }
  return fallbackCard(item.title)
}
