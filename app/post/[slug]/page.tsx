import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export const metadata = { robots: { index: false, follow: false } }

export default function NewsPostPage() {
  redirect(ROUTES.home)
}
