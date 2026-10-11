import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

// Script/style 'unsafe-inline' is required by Next's inline bootstrap + Tailwind; tighten with nonces if you add a CDN.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com https://www.facebook.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.facebook.com https://connect.facebook.net",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // The dev MCP server appends every page view to .next/dev/logs/next-development.log. On Windows,
    // Turbopack's watcher picks that write up as a change, rebuilds and reloads the page, which writes
    // the log again: an endless reload loop. Nothing in this project uses the MCP endpoint.
    mcpServer: false,
  },
  images: {
    // WebP only: AVIF is slower to encode on first request and gains little for these photos
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async redirects() {
    return [
      { source: '/orders', destination: '/account', permanent: false },
      { source: '/account/orders', destination: '/account', permanent: false },
      { source: '/shop', destination: '/products', permanent: false },
      { source: '/admin', destination: '/admin/dashboard', permanent: false },
      { source: '/location', destination: '/visit', permanent: false },
      { source: '/find-us', destination: '/visit', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
        ],
      },
      // Uploaded product photos get unique names, so they are safe to cache hard.
      { source: '/uploads/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/photos/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }] },
      // Brand assets keep stable names, so revalidate daily rather than "immutable for a year".
      { source: '/logo.svg', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
