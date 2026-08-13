import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export default function robots(): MetadataRoute.Robots {
  // AI crawlers — explicitly allow (they respect these opt-in signals)
  const aiCrawlers = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
    'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Googlebot-News',
    'CCBot', 'cohere-ai', 'YouBot',
    'Applebot', 'Applebot-Extended',
    'FacebookBot', 'meta-externalagent',
    'Amazonbot', 'DuckAssistBot',
    'Bytespider', 'PetalBot',
    'Diffbot', 'Timpibot',
    'ImagesiftBot', 'omgili',
    'MistralAI-User', 'ai2bot',
  ];

  // Bad bots — block aggressively
  const badBots = [
    'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot',
    'BLEXBot', 'DataForSeoBot', 'SEOkicks',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/_next/', '/private/', '*.json$'] },
      ...aiCrawlers.map((bot) => ({ userAgent: bot, allow: '/' as const })),
      ...badBots.map((bot) => ({ userAgent: bot, disallow: '/' as const })),
      { userAgent: 'Googlebot-Image', allow: ['/', '/og/'] },
      { userAgent: 'Googlebot-News', allow: '/blog/' },
    ],
    sitemap: [
      `${SITE_URL}/sitemap-index.xml`,
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-news.xml`,
    ],
    host: SITE_URL,
  };
}
