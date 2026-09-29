import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { COMPANY } from '@/lib/utils'
import { AppProviders } from '@/components/app-providers'

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: `${COMPANY.name} | ${COMPANY.tagline}`,
  description: 'Medical equipment, laboratory supplies, and clinical consumables for hospitals and clinics across Kenya.',
  applicationName: COMPANY.name,
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
    title: `${COMPANY.name} | ${COMPANY.tagline}`,
    description: 'Medical equipment, laboratory supplies, and clinical consumables for hospitals and clinics across Kenya.',
    images: [{ url: COMPANY.logo, width: 1024, height: 341, alt: COMPANY.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${COMPANY.name} | ${COMPANY.tagline}`,
    description: 'Medical equipment, laboratory supplies, and clinical consumables for hospitals and clinics across Kenya.',
    images: [COMPANY.logo],
  },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#0b1220' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.name,
    url: COMPANY.url,
    logo: `${COMPANY.url}${COMPANY.logo}`,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Commerce House, 3rd Floor, Room 308–309, Moi Avenue',
      addressLocality: 'Nairobi',
      postalCode: '00200',
      addressCountry: 'KE',
    },
  }

  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AppProviders>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </AppProviders>
      </body>
    </html>
  )
}
