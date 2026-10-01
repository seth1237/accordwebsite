import os from 'node:os'

const isProdBuild = process.env.NODE_ENV === 'production' && !process.env.VERCEL

function localDevOrigins() {
  const origins = new Set(['127.0.0.1', 'localhost'])
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.family === 'IPv4' && !addr.internal) origins.add(addr.address)
    }
  }
  return [...origins]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: localDevOrigins(),
  // Standalone is for Docker/VPS production builds only. Skip it in `next dev`
  // and on Vercel (Vercel needs NFT traces such as next-server.js.nft.json).
  ...(isProdBuild ? { output: 'standalone' } : {}),
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['mysql2', 'sharp'],
  experimental: {
    proxyClientMaxBodySize: '50mb',
    serverActions: { bodySizeLimit: '50mb' },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'backend.codewithseth.co.ke' },
      { protocol: 'https', hostname: 'accordmedical.co.ke' },
      { protocol: 'https', hostname: 'accord.codewithseth.co.ke' },
    ],
  },
  async redirects() {
    return [
      { source: '/shop', destination: '/products', permanent: true },
      { source: '/shop/:path*', destination: '/products', permanent: true },
      { source: '/contact', destination: '/get-in-touch/contact', permanent: true },
      { source: '/contact-us', destination: '/get-in-touch/contact', permanent: true },
      { source: '/about', destination: '/about.html', permanent: true },
      { source: '/about-us', destination: '/about.html', permanent: true },
      { source: '/about-us/', destination: '/about.html', permanent: true },
      { source: '/blog', destination: '/news', permanent: true },
      { source: '/products/:path+', destination: '/product/:path+', permanent: true },
      { source: '/categories/:id', destination: '/category/:id', permanent: true },
      { source: '/product-category/:path*', destination: '/category/:path*', permanent: true },
      { source: '/category/all', destination: '/products', permanent: true },
      { source: '/category/:parent/:child', destination: '/category/:parent', permanent: true },
      { source: '/category/hospital-furniture', destination: '/category/furniture', permanent: true },
      { source: '/category/homecare-equipment', destination: '/category/homecare', permanent: true },
      { source: '/category/laboratory-equipment', destination: '/category/laboratory', permanent: true },
      { source: '/category/maternity-equipment', destination: '/category/maternity', permanent: true },
      { source: '/category/theatre-and-intensive-care-unit-icu-equipment', destination: '/category/theatre-intensive-care-unit', permanent: true },
      { source: '/category/operating-theatre-equipment', destination: '/category/theatre-intensive-care-unit', permanent: true },
      { source: '/category/imaging-equipment', destination: '/category/imaging', permanent: true },
      { source: '/category/renal-equipment', destination: '/category/renal', permanent: true },
      { source: '/category/dental-equipment', destination: '/category/dental', permanent: true },
      { source: '/category/hosptital-furniture', destination: '/category/furniture', permanent: true },
      { source: '/brand/:slug', destination: '/manufacturers', permanent: true },
      { source: '/product-tag/:slug', destination: '/products', permanent: true },
      { source: '/privacy-policy.html', destination: '/about.html', permanent: true },
      { source: '/terms-conditions.html', destination: '/about.html', permanent: true },
      { source: '/jobs/:slug', destination: '/vacancy/:slug', permanent: true },
      { source: '/quote', destination: '/cart/view', permanent: true },
      { source: '/installations', destination: '/projects', permanent: true },
      { source: '/installations/:slug', destination: '/project/:slug', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/customer-request/get-quote', destination: '/cart/view' },
    ]
  },
  async headers() {
    return [
      {
        source: '/((?!_next/).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
