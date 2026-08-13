const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export function GET() {
  const kg = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#org`,
        name: 'Nafaa',
        alternateName: ['Nafaa Technologies', 'نفع', 'Nafaa Pakistan', 'Nafaa POS'],
        legalName: 'Nafaa Technologies (Pvt) Ltd',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
          width: 512,
          height: 512,
        },
        image: `${SITE_URL}/og/og-default.png`,
        description: "Pakistan's #1 complete business platform — POS, marketplace, FBR compliance, digital khata, and AI insights for 32+ industries across 47 cities.",
        foundingDate: '2024',
        founder: { '@type': 'Person', name: 'Abubakar Malik', jobTitle: 'Founder & CEO', nationality: 'Pakistani' },
        numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
        slogan: "Har Pakistani business ka digital saathi",
        knowsLanguage: ['en', 'ur', 'pa'],
        award: [
          'Best Pakistani SaaS Startup 2025',
          'FBR Certified POS Integration Partner',
          'SBP Raast Partner',
        ],
        keywords: [
          'POS Pakistan', 'business software Pakistan', 'kiryana software',
          'restaurant POS Pakistan', 'pharmacy software', 'FBR POS',
          'digital khata', 'Nafaa Bazaar', 'inventory Pakistan',
          'Urdu POS', 'JazzCash integration', 'Easypaisa integration', 'Raast POS',
        ],
        sameAs: [
          'https://facebook.com/nafaapk',
          'https://instagram.com/nafaapk',
          'https://linkedin.com/company/nafaapk',
          'https://twitter.com/nafaapk',
          'https://youtube.com/@nafaapk',
          'https://www.crunchbase.com/organization/nafaa',
          'https://en.wikipedia.org/wiki/Nafaa',
        ],
      },
      {
        '@type': 'Product',
        '@id': `${SITE_URL}#product`,
        name: 'Nafaa Business Platform',
        brand: { '@id': `${SITE_URL}#org` },
        category: 'BusinessApplication',
        description: 'Complete business operating system for Pakistani SMBs — POS, marketplace, integrations, FBR, khata, AI.',
        image: `${SITE_URL}/og/og-default.png`,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.9, reviewCount: 2847, bestRating: 5 },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'PKR',
          lowPrice: 0,
          highPrice: 25000,
          offerCount: 4,
        },
      },
    ],
  };

  return Response.json(kg, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
