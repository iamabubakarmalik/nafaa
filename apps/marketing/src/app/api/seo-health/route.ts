import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export async function GET() {
  const checks: Array<{ name: string; url: string; status?: number; ok?: boolean }> = [
    { name: 'Homepage', url: `${SITE_URL}/` },
    { name: 'Sitemap', url: `${SITE_URL}/sitemap.xml` },
    { name: 'News Sitemap', url: `${SITE_URL}/sitemap-news.xml` },
    { name: 'Image Sitemap', url: `${SITE_URL}/sitemap-images.xml` },
    { name: 'Video Sitemap', url: `${SITE_URL}/sitemap-videos.xml` },
    { name: 'Robots', url: `${SITE_URL}/robots.txt` },
    { name: 'Manifest', url: `${SITE_URL}/manifest.webmanifest` },
    { name: 'RSS Feed', url: `${SITE_URL}/feed.xml` },
    { name: 'llms.txt', url: `${SITE_URL}/llms.txt` },
    { name: 'llms-full.txt', url: `${SITE_URL}/llms-full.txt` },
    { name: 'ai-plugin.json', url: `${SITE_URL}/ai-plugin.json` },
    { name: 'Knowledge Graph', url: `${SITE_URL}/knowledge-graph.json` },
    { name: 'Entity file', url: `${SITE_URL}/entity.json` },
    { name: 'OpenAPI', url: `${SITE_URL}/openapi.yaml` },
    { name: 'MCP manifest', url: `${SITE_URL}/.well-known/mcp.json` },
    { name: 'AI policy', url: `${SITE_URL}/.well-known/ai.txt` },
    { name: 'Security', url: `${SITE_URL}/.well-known/security.txt` },
    { name: 'IndexNow key', url: `${SITE_URL}/nafaa-2026-indexnow.txt` },
    { name: 'humans.txt', url: `${SITE_URL}/humans.txt` },
    { name: 'ads.txt', url: `${SITE_URL}/ads.txt` },
  ];

  const results = await Promise.all(
    checks.map(async (c) => {
      try {
        const res = await fetch(c.url, { method: 'HEAD', cache: 'no-store' });
        return { ...c, status: res.status, ok: res.ok };
      } catch {
        return { ...c, status: 0, ok: false };
      }
    })
  );

  const summary = {
    total: results.length,
    passing: results.filter((r) => r.ok).length,
    failing: results.filter((r) => !r.ok).length,
    healthScore: Math.round((results.filter((r) => r.ok).length / results.length) * 100),
  };

  return NextResponse.json({ summary, checks: results, checkedAt: new Date().toISOString() });
}
