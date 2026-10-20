/**
 * Next.js config for the nafaa.pk site (apps/site).
 *
 * - Staging is noindexed until SITE_INDEXABLE=true (ARCH section 2). robots.ts
 *   handles the robots file; this adds the matching X-Robots-Tag header.
 * - /_dev/* pages are internal galleries: always noindex, and 404 in production
 *   builds unless SITE_DEV_PAGES=true (see src/app/%5Fdev/dev-pages.ts).
 * - Images are served by Cloudinary through a custom loader (src/lib/media.ts),
 *   so Next's own optimiser is not used.
 */
import type { NextConfig } from 'next';
import path from 'node:path';

const indexable = process.env.SITE_INDEXABLE === 'true';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },

  async headers() {
    const headers = [
      {
        source: '/:path*',
        headers: indexable
          ? securityHeaders
          : [...securityHeaders, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/_dev/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
    return headers;
  },
};

export default nextConfig;
