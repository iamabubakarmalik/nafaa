import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = [
    'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'CCBot',
    'cohere-ai', 'YouBot', 'Applebot-Extended', 'FacebookBot', 'meta-externalagent',
    'Amazonbot', 'Bytespider', 'DuckAssistBot', 'OAI-SearchBot',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/_next/'] },
      ...aiCrawlers.map((bot) => ({ userAgent: bot, allow: '/' as const })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
