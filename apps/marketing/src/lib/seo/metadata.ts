import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';
const SITE_NAME = 'Nafaa';

interface Props {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  publishedTime?: string;
  authors?: string[];
  locale?: 'en' | 'ur';
}

export function buildMetadata({
  title, description, path = '/', image, type = 'website',
  keywords = [], publishedTime, authors, locale = 'en',
}: Props = {}): Metadata {
  const fullTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — Pakistan's #1 Complete Business Platform`;

  const desc = description ??
    "The all-in-one platform for Pakistani businesses: modern POS, unified marketplace, integrations, multi-shop, FBR compliance, digital khata, and AI-powered insights.";

  const url = `${SITE_URL}${path}`;
  const imageUrl = (image ?? '/og/og-default.png').startsWith('http')
    ? (image ?? '/og/og-default.png')
    : `${SITE_URL}${image ?? '/og/og-default.png'}`;

  const defaultKeywords = [
    // Core
    'business software Pakistan', 'POS Pakistan', 'inventory management Pakistan',
    'marketplace Pakistan', 'FBR POS integration', 'digital khata app', 'shop management software',
    'best POS Pakistan 2026', 'cloud POS Pakistan', 'offline POS Pakistan',
    // Industries (32)
    'restaurant POS Pakistan', 'pharmacy software Pakistan DRAP', 'kiryana store software',
    'bakery POS Pakistan', 'jewelry software Pakistan gold rate', 'carpet shop software',
    'salon software Pakistan', 'gym management Pakistan', 'clinic management Pakistan',
    'auto parts software Pakistan', 'mobile shop IMEI software', 'garment shop software',
    'hardware store software', 'bookstore software', 'hotel management Pakistan',
    'dairy farm software', 'meat shop software', 'wholesale distribution Pakistan',
    'furniture shop software', 'shoes shop software', 'stationery shop', 'sweets shop POS',
    'laundry software', 'tailor shop software', 'car rental software Pakistan',
    'school management Pakistan', 'petrol pump software', 'juice shop POS',
    'fruit vegetable shop', 'poultry farm software', 'ice cream parlor POS', 'photo studio software',
    // Payments
    'JazzCash POS', 'Easypaisa POS', 'Raast POS', 'NayaPay integration',
    'SadaPay POS', 'Stripe Pakistan',
    // Integrations
    'Foodpanda integration', 'Daraz seller Pakistan', 'Shopify Pakistan',
    'WhatsApp business Pakistan', 'Meta ads Pakistan', 'Google ads Pakistan',
    // Cities
    'POS Karachi', 'POS Lahore', 'POS Islamabad', 'POS Faisalabad',
    'POS Rawalpindi', 'POS Peshawar', 'POS Quetta', 'POS Multan',
    'POS Gujranwala', 'POS Sialkot', 'POS Hyderabad', 'POS Bahawalpur',
    // Language
    'Urdu POS', 'اردو POS', 'bilingual business software',
    // Compare
    'Tally alternative Pakistan', 'QuickBooks Pakistan', 'Excel replacement business',
    // Global
    'best SMB software 2026', 'small business platform', 'unified commerce platform',
    'omnichannel retail', 'AI business assistant',
  ];

  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description: desc,
    keywords: [...defaultKeywords, ...keywords],
    authors: authors ? authors.map((n) => ({ name: n })) : [{ name: 'Nafaa Technologies', url: SITE_URL }],
    creator: 'Nafaa Technologies',
    publisher: 'Nafaa Technologies',
    applicationName: SITE_NAME,
    referrer: 'origin-when-cross-origin',
    robots: {
      index: true, follow: true,
      googleBot: {
        index: true, follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: url,
      languages: {
        'en-PK': url,
        'ur-PK': url,
        'x-default': url,
      },
    },
    openGraph: {
      type, locale: locale === 'ur' ? 'ur_PK' : 'en_PK',
      alternateLocale: locale === 'ur' ? ['en_PK'] : ['ur_PK'],
      url, siteName: SITE_NAME, title: fullTitle, description: desc,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: fullTitle }],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image', title: fullTitle, description: desc,
      images: [imageUrl], creator: '@nafaapk', site: '@nafaapk',
    },
    other: {
      'geo.region': 'PK', 'geo.country': 'Pakistan', 'geo.placename': 'Gujranwala',
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
  };
}
