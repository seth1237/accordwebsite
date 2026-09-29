'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function HashRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (window.location.hash === '#contact') router.replace('/get-in-touch/contact')
  }, [router])
  return null
}
