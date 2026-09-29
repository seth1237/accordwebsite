'use client'

import { QuoteCartProvider } from '@/components/quote-cart'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QuoteCartProvider>{children}</QuoteCartProvider>
}
