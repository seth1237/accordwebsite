import { generateEventOgImage } from '@/lib/event-og-image'

export const runtime = 'nodejs'
export const alt = 'Event'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'
export const revalidate = 3600

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  return generateEventOgImage(props)
}
