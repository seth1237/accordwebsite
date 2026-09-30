'use client'

import { QuoteCartProvider } from '@/components/quote-cart'
import { VisitTracker } from '@/components/visit-tracker'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QuoteCartProvider>
      <VisitTracker />
      {children}
    </QuoteCartProvider>
  )
}
