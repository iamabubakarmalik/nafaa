import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nafaa — Pakistan's #1 Complete Business Platform",
    short_name: 'Nafaa',
    description: 'POS, marketplace, integrations, FBR compliance, and digital khata — all in one platform.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0e27',
    theme_color: '#12b76a',
    categories: ['business', 'productivity', 'finance', 'shopping'],
    lang: 'en-PK',
    dir: 'ltr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Marketplace', url: '/marketplace', description: 'Visit Nafaa Bazaar' },
      { name: 'Pricing', url: '/pricing', description: 'See plans and pricing' },
      { name: 'Contact', url: '/contact', description: 'Get in touch' },
    ],
  };
}
