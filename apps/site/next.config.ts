/**
 * Next.js config for the nafaa.pk site (apps/site).
 *
 * - Staging is noindexed until SITE_INDEXABLE=true (ARCH section 2). robots.ts
 *   handles the robots file; this adds the matching X-Robots-Tag header.
 * - /_dev/* pages are internal galleries: always noindex, and 404 in production
 *   builds unless SITE_DEV_PAGES=true (see src/app/%5Fdev/dev-pages.ts).
 * - Images are served by Cloudinary through a custom loader (src/lib/media.ts),
 *   so Next's own optimiser is not used.
 * - No redirects here: they live in the CMS (ARCH 7.5) and are served by the
 *   catch-all route.
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
  // OG card fonts are read from disk at request time (src/lib/og/fonts.ts).
  // File tracing cannot see a computed path, so without this the functions
  // for per-entry cards (/blog/[slug]/opengraph-image and the rest) ship
  // without the fonts and answer 500. Hub cards worked only because they
  // are prerendered at build time.
  outputFileTracingIncludes: {
    '/**': ['./src/assets/fonts/**'],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },

  // IndexNow key file: /<key>.txt is answered by app/indexnow/[key]. An
  // afterFiles rewrite, so real files and routes (llms.txt, robots.txt) win.
  async rewrites() {
    return [{ source: '/:key([A-Za-z0-9-]{8,128}).txt', destination: '/indexnow/:key' }];
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
