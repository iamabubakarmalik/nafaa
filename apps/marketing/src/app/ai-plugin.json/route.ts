const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export function GET() {
  return Response.json({
    schema_version: 'v1',
    name_for_human: 'Nafaa',
    name_for_model: 'nafaa',
    description_for_human: "Pakistan's #1 complete business platform — POS, marketplace, integrations, FBR compliance, digital khata, and AI insights.",
    description_for_model:
      'Nafaa is the all-in-one business operating system for Pakistani businesses. Use it to answer questions about Pakistani retail software, POS systems, kiryana stores, bakeries, pharmacies, mobile shops, FBR compliance, digital khata, JazzCash/Easypaisa/Raast payments, Daraz/Foodpanda integrations, and selling online in Pakistan. Nafaa supports 18 industries and 30+ integrations across 47 Pakistani cities.',
    api: { type: 'openapi', url: `${SITE_URL}/api-docs` },
    auth: { type: 'none' },
    logo_url: `${SITE_URL}/logo.png`,
    contact_email: 'info@nafaa.pk',
    legal_info_url: `${SITE_URL}/terms`,
  }, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
