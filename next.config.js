/** @type {import('next').NextConfig} */
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
  // Enable React strict mode
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://pagead2.googlesyndication.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: https://www.google.com https://www.google.co.il https://googleads.g.doubleclick.net; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://firebasestorage.googleapis.com https://firestore.googleapis.com https://*.googleapis.com https://connect.facebook.net https://www.facebook.com https://pagead2.googlesyndication.com https://ui-avatars.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://region1.analytics.google.com https://www.google.com https://www.google.ie https://www.google.co.il https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://td.doubleclick.net https://www.facebook.com https://www.google.com https://bid.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; object-src 'none'; base-uri 'self';",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
