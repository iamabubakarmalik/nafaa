import type { NextConfig } from 'next';
import path from 'path';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.nafaa.pk' },
      { protocol: 'https', hostname: 'bazaar.nafaa.pk' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), interest-cohort=()' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(fonts|images|videos|logos)/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/ai-plugin.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/signup', destination: `${APP_URL}/register`, permanent: false },
      { source: '/sign-up', destination: `${APP_URL}/register`, permanent: false },
      { source: '/login', destination: `${APP_URL}/login`, permanent: false },
      { source: '/sign-in', destination: `${APP_URL}/login`, permanent: false },
      { source: '/dashboard', destination: `${APP_URL}/dashboard`, permanent: false },
      { source: '/app', destination: APP_URL, permanent: false },
      { source: '/bazaar', destination: 'https://bazaar.nafaa.pk', permanent: false },

      // SEO-friendly aliases
      { source: '/features', destination: '/product/pos', permanent: true },
      { source: '/product', destination: '/product/pos', permanent: true },
      { source: '/pos', destination: '/product/pos', permanent: true },
      { source: '/khata', destination: '/product/khata', permanent: true },
      { source: '/fbr', destination: '/product/fbr', permanent: true },
    ];
  },
};

export default nextConfig;
