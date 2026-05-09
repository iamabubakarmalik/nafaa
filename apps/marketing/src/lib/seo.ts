import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Nafaa';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  publishedTime?: string;
  authors?: string[];
}

// Page-specific OG images
const ogImageMap: Record<string, string> = {
  '/': '/og/og-default.png',
  '/pricing': '/og/og-pricing.png',
  '/features': '/og/og-features.png',
  '/blog': '/og/og-blog.png',
  '/industries/bakery': '/og/og-industry-bakery.png',
  '/industries/kiryana': '/og/og-industry-kiryana.png',
  '/industries/mobile-shop': '/og/og-industry-mobile-shop.png',
  '/industries/pharmacy': '/og/og-industry-pharmacy.png',
};

function pickOgImage(path: string): string {
  if (ogImageMap[path]) return ogImageMap[path];
  if (path.startsWith('/blog/')) return '/og/og-blog.png';
  if (path.startsWith('/industries/')) return '/og/og-default.png';
  return '/og/og-default.png';
}

export function buildMetadata({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  keywords = [],
  publishedTime,
  authors,
}: SEOProps = {}): Metadata {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Pakistan's #1 Retail POS & Inventory Software`;
  const desc =
    description ||
    'Nafaa is Pakistan-first POS, inventory, and accounting software for shops, bakeries, kiryana stores, mobile shops, and pharmacies. Free trial — no credit card required.';
  const url = `${SITE_URL}${path}`;
  const finalImage = image || pickOgImage(path);
  const imageUrl = finalImage.startsWith('http') ? finalImage : `${SITE_URL}${finalImage}`;

  const defaultKeywords = [
    'POS software Pakistan',
    'shop management software Pakistan',
    'inventory software Pakistan',
    'kiryana store software',
    'bakery POS Pakistan',
    'mobile shop software',
    'pharmacy software Pakistan',
    'retail software Pakistan',
    'cash register Pakistan',
    'khata book digital',
    'udhaar app Pakistan',
    'دکان سافٹ ویئر',
    'POS پاکستان',
    'انوینٹری مینیجمنٹ',
  ];

  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description: desc,
    keywords: [...defaultKeywords, ...keywords],
    authors: authors ? authors.map((name) => ({ name })) : [{ name: 'Nafaa Technologies', url: SITE_URL }],
    creator: 'Nafaa Technologies',
    publisher: 'Nafaa Technologies',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
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
      type,
      locale: 'en_PK',
      alternateLocale: ['ur_PK'],
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: desc,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      images: [imageUrl],
      creator: '@nafaapk',
      site: '@nafaapk',
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
    other: {
      'geo.region': 'PK',
      'geo.country': 'Pakistan',
      'geo.placename': 'Lahore',
    },
  };
}

export function buildJsonLdOrg() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    description:
      "Pakistan's #1 retail POS, inventory, and accounting software for shops, bakeries, kiryana stores, mobile shops, and pharmacies.",
    url: SITE_URL,
    image: `${SITE_URL}/og/og-default.png`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '5247',
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
      availability: 'https://schema.org/InStock',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nafaa Technologies',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'PK',
        addressLocality: 'Lahore',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+92-300-1234567',
        contactType: 'Customer Support',
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
      sameAs: [
        'https://facebook.com/nafaapk',
        'https://twitter.com/nafaapk',
        'https://instagram.com/nafaapk',
        'https://linkedin.com/company/nafaapk',
      ],
    },
  };
}

export function buildJsonLdFAQ(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

export function buildJsonLdBreadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
