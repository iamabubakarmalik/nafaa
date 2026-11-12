/**
 * Next.js config for the Nafaa Stores storefront (apps/storefront).
 *
 * - Multi-tenant: middleware.ts maps the request host to a shop and rewrites
 *   every page to /s/<site>/<lang>/..., so each shop and language is cached
 *   on its own (ISR) and revalidated by tag from the API.
 * - Product images come from many hosts (Nafaa uploads, Cloudinary, Shopify
 *   CDN after an import), so any https host is allowed for next/image.
 * - Framing: only the shop itself and the Nafaa web app (theme editor live
 *   preview) may show the storefront in an iframe (STORE_EDITOR_ORIGINS).
 *   Set here, not in middleware: response headers added by middleware make
 *   self-hosted Next skip the ISR cache.
 */
import type { NextConfig } from 'next';
import path from 'node:path';

const editorOrigins = process.env.STORE_EDITOR_ORIGINS || 'https://app.nafaa.pk https://*.nafaa.pk http://localhost:5173';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${editorOrigins}` },
        ],
      },
    ];
  },
};

export default nextConfig;
