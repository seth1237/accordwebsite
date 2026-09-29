const isProdBuild = process.env.NODE_ENV === 'production' && !process.env.VERCEL

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone is for Docker/VPS production builds only. Skip it in `next dev`
  // and on Vercel (Vercel needs NFT traces such as next-server.js.nft.json).
  ...(isProdBuild ? { output: 'standalone' } : {}),
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['mysql2'],
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
    ],
  },
  async redirects() {
    return [
      { source: '/shop', destination: '/products', permanent: true },
      { source: '/contact', destination: '/get-in-touch/contact', permanent: true },
      { source: '/contact-us', destination: '/get-in-touch/contact', permanent: true },
      { source: '/about', destination: '/about.html', permanent: true },
      { source: '/about-us', destination: '/about.html', permanent: true },
      { source: '/blog', destination: '/news', permanent: true },
      { source: '/products/:path+', destination: '/product/:path+', permanent: true },
      { source: '/categories/:id', destination: '/category/:id', permanent: true },
      { source: '/product-category/:path*', destination: '/category/:path*', permanent: true },
      { source: '/category/hospital-furniture', destination: '/category/furniture', permanent: true },
      { source: '/category/homecare-equipment', destination: '/category/homecare', permanent: true },
      { source: '/category/laboratory-equipment', destination: '/category/laboratory', permanent: true },
      { source: '/category/maternity-equipment', destination: '/category/maternity', permanent: true },
      { source: '/category/theatre-and-intensive-care-unit-icu-equipment', destination: '/category/theatre-intensive-care-unit', permanent: true },
      { source: '/category/imaging-equipment', destination: '/category/imaging', permanent: true },
      { source: '/category/renal-equipment', destination: '/category/renal', permanent: true },
      { source: '/category/dental-equipment', destination: '/category/dental', permanent: true },
      { source: '/category/hosptital-furniture', destination: '/category/furniture', permanent: true },
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
        source: '/(.*)',
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
