import type { NextConfig } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.nafaa.pk' },
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
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Old signup URL → app register (preserves query params automatically)
      { source: '/signup', destination: `${APP_URL}/register`, permanent: false },
      { source: '/sign-up', destination: `${APP_URL}/register`, permanent: false },
      // Login redirect to app (preserves ?ref= automatically per Next.js spec)
      { source: '/login', destination: `${APP_URL}/login`, permanent: false },
      { source: '/sign-in', destination: `${APP_URL}/login`, permanent: false },
      // Dashboard shortcuts
      { source: '/dashboard', destination: `${APP_URL}/dashboard`, permanent: false },
      { source: '/app', destination: APP_URL, permanent: false },
    ];
  },
};

export default nextConfig;
