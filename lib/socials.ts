export const TWITTER_HANDLE = 'AccordMedKe'

export const SOCIAL_LINKS = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/AccordMedKe' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/accordmedicalke/' },
  { id: 'x', label: 'X', href: 'https://x.com/AccordMedKe' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/accord-medical-supplies-ltd/' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@accordmedicalke' },
] as const

export type SocialId = (typeof SOCIAL_LINKS)[number]['id']

export function socialProfileUrls() {
  return SOCIAL_LINKS.map((item) => item.href)
}

export function shareFacebookUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export function shareXUrl(url: string, text: string) {
  return `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}&via=${TWITTER_HANDLE}`
}

export function shareLinkedInUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

export function shareWhatsAppUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
}
