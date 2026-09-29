import Image from 'next/image'
import Link from 'next/link'
import { COMPANY } from '@/lib/utils'

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${COMPANY.name} home`}>
      <Image
        src="/logo-only.png"
        alt={`${COMPANY.name} — ${COMPANY.tagline}`}
        width={300}
        height={100}
        priority
        className="logo-img"
      />
    </Link>
  )
}
