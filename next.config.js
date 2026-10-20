/** @type {import('next').NextConfig} */

/**
 * worker-src — DO NOT DELETE. Kept out of the template literal below only so
 * this note can sit next to it.
 *
 * Declaring worker-src at all stops workers inheriting from script-src, so it
 * must name every worker the site legitimately creates:
 *   blob:  heic2any builds its libheif worker from a blob: URL — that is how an
 *          iPhone HEIC upload becomes a JPEG in the designer. Without it the
 *          worker never starts and the conversion promise never settles: the
 *          customer sits on a spinner until the 45s timeout in DesignStep.
 *          three-stdlib's DRACOLoader/KTX2Loader build workers the same way.
 *   'self' same-origin worker chunks, should Next ever emit one.
 *
 * blob: here is much narrower than blob: in script-src: it only permits
 * starting a worker from a Blob this origin's own script already created. It
 * does not let a <script> element or an import load a blob: URL.
 *
 * NOT SUFFICIENT ON ITS OWN for HEIC: a blob: worker inherits this document's
 * CSP, and heic2any's libheif build evaluates a string at startup, so it still
 * dies on EvalError while script-src has no 'unsafe-eval'. Fixing that means
 * moving libheif to a same-origin worker file with its own path-scoped header
 * below — NOT adding 'unsafe-eval' to the page-wide script-src.
 */
const WORKER_SRC = "worker-src 'self' blob:"

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"}
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
  ${WORKER_SRC};
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
    https://*.doubleclick.net
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
  frame-ancestors 'self';
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
      { source: '/comments/:path*', destination: '/', permanent: true },
      // Deal → packages (deal page no longer exists)
      { source: '/Deal', destination: '/packages', permanent: true },
      { source: '/deal', destination: '/packages', permanent: true },
      // Lion Roar campaign removed
      { source: '/lion-roar', destination: '/', permanent: true },
      // Old misc pages
      { source: '/ads', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/Home', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // 3D models + their textures are content-stable: when a model is
        // replaced, its FILE NAME must change (e.g. -v2), otherwise browsers
        // keep the old one for a year. Long cache = instant repeat loads.
        source: '/models/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
