import { SOCIAL_LINKS, type SocialId } from '@/lib/socials'

function SocialIcon({ id }: { id: SocialId }) {
  const icons: Record<SocialId, string> = {
    facebook:
      'M15 8h3V5h-3c-2 0-4 2-4 4v2H8v3h3v8h3v-8h3l1-3h-4V9c0-1 1-1 2-1z',
    instagram:
      'M7 3h10c2 0 4 2 4 4v10c0 2-2 4-4 4H7c-2 0-4-2-4-4V7c0-2 2-4 4-4zm10 2H7c-1 0-2 1-2 2v10c0 1 1 2 2 2h10c1 0 2-1 2-2V7c0-1-1-2-2-2zm-5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm5-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
    x: 'M14 10l7-8h-2l-6 7-4-7H3l7 10-7 8h2l6-7 5 7h6l-8-10zm-3 3l-1-1-5-8h2l5 6 1 1 6 8h-2l-5-6z',
    linkedin:
      'M6 9H4v11h2V9zM5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm15 9c0-3-2-5-4-5-2 0-3 1-3 2V9h-2v11h2v-6c0-2 1-3 2-3s2 1 2 3v6h3v-7z',
    tiktok:
      'M14 3c0 2 1 3 2 4 1 1 2 2 4 2v3c-2 0-3-1-5-2v6c0 4-3 7-7 7s-7-3-7-7 3-7 7-7v3c-2 0-4 2-4 4s2 4 4 4 4-2 4-4V3h2z',
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={icons[id]} />
    </svg>
  )
}

export function SocialLinks({
  labeled = false,
  className,
}: {
  labeled?: boolean
  className?: string
}) {
  const classes = ['social-links', labeled ? 'social-links-labeled' : '', className || ''].filter(Boolean).join(' ')
  return (
    <nav className={classes} aria-label="Accord Medical Supplies on social media">
      {SOCIAL_LINKS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer me"
          aria-label={`${item.label} - Accord Medical Supplies`}
        >
          <SocialIcon id={item.id} />
          {labeled ? <span>{item.label}</span> : null}
        </a>
      ))}
    </nav>
  )
}
