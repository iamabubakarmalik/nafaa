const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export const jsonLdOrg = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}#organization`,
  name: 'Nafaa Technologies',
  legalName: 'Nafaa Technologies',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: "Pakistan's #1 complete business platform: POS, marketplace, integrations, and AI.",
  foundingDate: '2024',
  founders: [{ '@type': 'Person', name: 'Abubakar Malik' }],
  address: [
    {
      '@type': 'PostalAddress',
      streetAddress: 'Citi Housing Phase 1',
      addressLocality: 'Gujranwala',
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: 'LDA Avenue',
      addressLocality: 'Lahore',
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
  ],
  contactPoint: [
    { '@type': 'ContactPoint', telephone: '+92-324-1772933', contactType: 'sales', areaServed: 'PK', availableLanguage: ['English', 'Urdu'] },
    { '@type': 'ContactPoint', email: 'support@nafaa.pk', contactType: 'customer support', areaServed: 'PK', availableLanguage: ['English', 'Urdu'] },
  ],
  sameAs: [
    'https://facebook.com/nafaapk',
    'https://instagram.com/nafaapk',
    'https://linkedin.com/company/nafaapk',
    'https://twitter.com/nafaapk',
    'https://youtube.com/@nafaapk',
  ],
});

export const jsonLdWebsite = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}#website`,
  url: SITE_URL,
  name: 'Nafaa',
  publisher: { '@id': `${SITE_URL}#organization` },
  inLanguage: ['en-PK', 'ur-PK'],
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export const jsonLdSoftware = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Nafaa',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, iOS, Windows, macOS',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '2847', bestRating: '5' },
  publisher: { '@id': `${SITE_URL}#organization` },
});

export const jsonLdFAQ = (faqs: Array<{ q: string; a: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

export const jsonLdBreadcrumb = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name,
    item: it.url.startsWith('http') ? it.url : `${SITE_URL}${it.url}`,
  })),
});

export const jsonLdProduct = (p: { name: string; description: string; image?: string; slug: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: p.name,
  description: p.description,
  image: p.image ?? `${SITE_URL}/og/og-default.png`,
  brand: { '@type': 'Brand', name: 'Nafaa' },
  url: `${SITE_URL}${p.slug}`,
  offers: { '@type': 'Offer', priceCurrency: 'PKR', price: '0', availability: 'https://schema.org/InStock' },
});

export const jsonLdHowTo = (p: { name: string; description: string; steps: Array<{ name: string; text: string }> }) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: p.name,
  description: p.description,
  step: p.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
});

export const jsonLdArticle = (p: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: p.title,
  description: p.description,
  author: { '@type': 'Person', name: p.author },
  datePublished: p.datePublished,
  dateModified: p.dateModified ?? p.datePublished,
  image: p.image ?? `${SITE_URL}/og/og-default.png`,
  mainEntityOfPage: p.url,
  publisher: { '@id': `${SITE_URL}#organization` },
});
