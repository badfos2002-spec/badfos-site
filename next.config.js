/** @type {import('next').NextConfig} */

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'
    https://*.google.com
    https://*.google.co.il
    https://*.gstatic.com
    https://*.googletagmanager.com
    https://*.google-analytics.com
    https://*.googleadservices.com
    https://googleads.g.doubleclick.net
    https://pagead2.googlesyndication.com
    https://googlesyndication.com
    https://ep1.adtrafficquality.google
    https://ep2.adtrafficquality.google
    https://connect.facebook.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self'
    https://*.google.com
    https://*.google.co.il
    https://*.google.ie
    https://*.googleapis.com
    https://*.google-analytics.com
    https://*.googletagmanager.com
    https://*.googleadservices.com
    https://googleads.g.doubleclick.net
    https://region1.analytics.google.com
    https://pagead2.googlesyndication.com
    https://ep1.adtrafficquality.google
    https://ep2.adtrafficquality.google
    https://connect.facebook.net
    https://www.facebook.com
    https://ui-avatars.com;
  frame-src 'self'
    https://*.google.com
    https://*.googletagmanager.com
    https://*.doubleclick.net
    https://*.googlesyndication.com
    https://ep1.adtrafficquality.google
    https://ep2.adtrafficquality.google
    https://www.youtube.com
    https://www.facebook.com
    https://*.firebaseapp.com;
  object-src 'none';
  base-uri 'self';
`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
]

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/firestore', 'firebase-admin'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  reactStrictMode: true,
  async redirects() {
    return [
      // Old Base44/WordPress URLs → new routes
      { source: '/shop/:path*', destination: '/designer', permanent: true },
      { source: '/product-tag/:path*', destination: '/designer', permanent: true },
      { source: '/product-category/:path*', destination: '/designer', permanent: true },
      { source: '/Tshirt', destination: '/designer/tshirt', permanent: true },
      { source: '/tshirt', destination: '/designer/tshirt', permanent: true },
      // Case-sensitive old routes
      { source: '/Contact', destination: '/contact', permanent: true },
      { source: '/Share/:path*', destination: '/share/:path*', permanent: true },
      { source: '/AdminPricing', destination: '/admin/pricing', permanent: true },
      { source: '/AdminImages', destination: '/admin/images', permanent: true },
      { source: '/AdminDashboard', destination: '/admin', permanent: true },
      { source: '/AdminAnalytics', destination: '/admin/analytics', permanent: true },
      // Old misc pages
      { source: '/ads', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
