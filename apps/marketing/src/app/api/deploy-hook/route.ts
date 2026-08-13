import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export async function POST() {
  const results: Record<string, any> = {};
  const now = new Date().toISOString();

  // 1. Google sitemap ping (deprecated but still works for some)
  try {
    const gRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`);
    results.google_sitemap = { ok: gRes.ok, status: gRes.status };
  } catch (err) {
    results.google_sitemap = { ok: false, error: (err as Error).message };
  }

  // 2. Bing IndexNow (covers Bing, Yandex, Seznam, Naver)
  const priorityUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/pricing`,
    `${SITE_URL}/marketplace`,
    `${SITE_URL}/industries`,
    `${SITE_URL}/integrations`,
    `${SITE_URL}/blog`,
    `${SITE_URL}/roi-calculator`,
    `${SITE_URL}/quiz`,
    `${SITE_URL}/demo`,
    `${SITE_URL}/contact`,
    `${SITE_URL}/about`,
    `${SITE_URL}/pricing`,
    `${SITE_URL}/fbr-wizard`,
    `${SITE_URL}/cost-predictor`,
    `${SITE_URL}/enterprise`,
  ];

  try {
    const bRes = await fetch(`${SITE_URL}/api/indexnow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: priorityUrls }),
    });
    results.indexnow = await bRes.json();
  } catch (err) {
    results.indexnow = { ok: false, error: (err as Error).message };
  }

  // 3. Yandex direct ping (backup)
  try {
    const yRes = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`);
    results.yandex = { ok: yRes.ok, status: yRes.status };
  } catch (err) {
    results.yandex = { ok: false, error: (err as Error).message };
  }

  // 4. Purge Cloudflare cache (if CLOUDFLARE_TOKEN + ZONE_ID set)
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purge_everything: true }),
        }
      );
      results.cloudflare = { ok: cfRes.ok, status: cfRes.status };
    } catch (err) {
      results.cloudflare = { ok: false, error: (err as Error).message };
    }
  }

  return NextResponse.json({
    ok: true,
    deployedAt: now,
    urlsSubmitted: priorityUrls.length,
    ...results,
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: `${SITE_URL}/api/deploy-hook`,
    method: 'POST',
    description: 'Call after each deploy to ping Google, Bing (IndexNow), Yandex, and purge Cloudflare cache',
    usage: 'Set up as Vercel webhook: Project → Settings → Git → Deploy Hooks',
  });
}
