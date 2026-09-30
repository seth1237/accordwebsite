import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { JsonLd } from '@/components/json-ld'
import { AppProviders } from '@/components/app-providers'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, organizationJsonLd } from '@/lib/seo'
import { COMPANY } from '@/lib/utils'

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${COMPANY.name}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: COMPANY.name,
  authors: [{ name: COMPANY.name, url: COMPANY.url }],
  creator: COMPANY.name,
  publisher: COMPANY.name,
  category: 'medical equipment',
  icons: {
    icon: COMPANY.logo,
    shortcut: COMPANY.logo,
    apple: COMPANY.logo,
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: COMPANY.url,
    siteName: COMPANY.name,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: COMPANY.logo, width: 1024, height: 341, alt: COMPANY.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [COMPANY.logo],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#0b1220' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-KE" className="bg-background">
      <body className="antialiased">
        <JsonLd data={organizationJsonLd()} />
        <AppProviders>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </AppProviders>
      </body>
    </html>
  )
}
