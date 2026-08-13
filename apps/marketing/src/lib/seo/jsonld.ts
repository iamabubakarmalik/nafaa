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

// ─── Speakable schema (voice assistants: Google Assistant, Alexa) ───
export const jsonLdSpeakable = (cssSelectors: string[] = ['h1', 'h2', '.speakable', 'article p:first-of-type']) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  },
});

// ─── LocalBusiness per city (47 cities × Google Maps ranking boost) ───
export const jsonLdLocalBusiness = (p: { city: string; region?: string; lat?: number; lng?: number }) => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/${p.city.toLowerCase()}#localbusiness`,
  name: `Nafaa — ${p.city}`,
  image: `${SITE_URL}/og/og-default.png`,
  telephone: '+92-324-1772933',
  email: 'info@nafaa.pk',
  url: `${SITE_URL}/${p.city.toLowerCase()}`,
  priceRange: 'Rs 0 - Rs 25,000/month',
  address: {
    '@type': 'PostalAddress',
    addressLocality: p.city,
    addressRegion: p.region || 'Punjab',
    addressCountry: 'PK',
  },
  ...(p.lat && p.lng ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } } : {}),
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '21:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '10:00', closes: '18:00' },
  ],
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '2847', bestRating: '5' },
  areaServed: { '@type': 'City', name: p.city },
});

// ─── VideoObject (product demo, YouTube tutorials) ───
export const jsonLdVideo = (p: {
  name: string; description: string; thumbnailUrl: string; uploadDate: string;
  duration?: string; contentUrl?: string; embedUrl?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: p.name,
  description: p.description,
  thumbnailUrl: p.thumbnailUrl,
  uploadDate: p.uploadDate,
  duration: p.duration || 'PT2M30S',
  contentUrl: p.contentUrl,
  embedUrl: p.embedUrl,
  publisher: { '@id': `${SITE_URL}#organization` },
});

// ─── Course (academy pages — Google for Education) ───
export const jsonLdCourse = (p: { name: string; description: string; slug: string; level?: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: p.name,
  description: p.description,
  provider: { '@id': `${SITE_URL}#organization` },
  url: `${SITE_URL}${p.slug}`,
  educationalLevel: p.level || 'Beginner',
  inLanguage: ['en-PK', 'ur-PK'],
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
    courseWorkload: 'PT2H',
  },
});

// ─── JobPosting (careers — appears in Google Jobs) ───
export const jsonLdJob = (p: {
  title: string; description: string; datePosted: string; validThrough?: string;
  employmentType?: string; salaryMin?: number; salaryMax?: number; city?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: p.title,
  description: p.description,
  datePosted: p.datePosted,
  validThrough: p.validThrough,
  employmentType: p.employmentType || 'FULL_TIME',
  hiringOrganization: { '@id': `${SITE_URL}#organization` },
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.city || 'Gujranwala',
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
  },
  ...(p.salaryMin && p.salaryMax ? {
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'PKR',
      value: { '@type': 'QuantitativeValue', minValue: p.salaryMin, maxValue: p.salaryMax, unitText: 'MONTH' },
    },
  } : {}),
});

// ─── Event (webinars, product launches) ───
export const jsonLdEvent = (p: {
  name: string; description: string; startDate: string; endDate?: string;
  url: string; isOnline?: boolean;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: p.name,
  description: p.description,
  startDate: p.startDate,
  endDate: p.endDate,
  eventAttendanceMode: p.isOnline
    ? 'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: p.isOnline
    ? { '@type': 'VirtualLocation', url: p.url }
    : { '@type': 'Place', name: 'Nafaa HQ', address: { '@type': 'PostalAddress', addressLocality: 'Gujranwala', addressCountry: 'PK' } },
  organizer: { '@id': `${SITE_URL}#organization` },
});

// ─── Review (case studies, testimonials) ───
export const jsonLdReview = (p: { author: string; rating: number; body: string; itemName: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Review',
  itemReviewed: { '@type': 'SoftwareApplication', name: p.itemName },
  reviewRating: { '@type': 'Rating', ratingValue: p.rating, bestRating: 5 },
  author: { '@type': 'Person', name: p.author },
  reviewBody: p.body,
});

// ─── Service (per integration/solution) ───
export const jsonLdService = (p: { name: string; description: string; slug: string; provider?: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: p.name,
  description: p.description,
  provider: { '@id': `${SITE_URL}#organization` },
  areaServed: { '@type': 'Country', name: 'Pakistan' },
  url: `${SITE_URL}${p.slug}`,
  serviceType: p.provider || 'Business Software',
  availableLanguage: ['English', 'Urdu'],
});

// ─── Dataset (public stats, live numbers) ───
export const jsonLdDataset = (p: { name: string; description: string; url: string; keywords?: string[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: p.name,
  description: p.description,
  url: p.url,
  keywords: p.keywords || ['Pakistan retail', 'POS transactions', 'SMB analytics'],
  creator: { '@id': `${SITE_URL}#organization` },
  license: 'https://creativecommons.org/licenses/by/4.0/',
  isAccessibleForFree: true,
});

// ─── SoftwareApplication with pricing tiers ───
export const jsonLdPricingPlan = (p: { name: string; price: number; features: string[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'Offer',
  name: p.name,
  price: p.price,
  priceCurrency: 'PKR',
  category: 'SaaS Subscription',
  itemOffered: {
    '@type': 'Service',
    name: `Nafaa ${p.name} Plan`,
    description: p.features.join('; '),
  },
});
