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
    'business software Pakistan', 'POS Pakistan', 'inventory Pakistan',
    'marketplace Pakistan', 'FBR POS', 'digital khata', 'shop management',
    'restaurant POS Pakistan', 'pharmacy software Pakistan', 'multi-shop',
    'kiryana store software', 'bakery POS Pakistan', 'jewelry software Pakistan',
    'carpet shop software', 'salon software Pakistan', 'gym management',
    'clinic management Pakistan', 'auto parts software',
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
