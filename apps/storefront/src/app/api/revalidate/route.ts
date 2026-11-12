/**
 * On-demand revalidation, called by the Nafaa API when a shop's products,
 * prices, stock, theme, menus or pages change (contract 1.12).
 *
 * Header x-nafaa-signature = hex HMAC-SHA256 of the raw body with
 * STOREFRONT_REVALIDATE_SECRET. Body { storeId, tags: string[], at }.
 * Tags are the ones lib/api.ts puts on its fetches (store:<id>, ...).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: 'Revalidation is not configured' }, { status: 503 });
  const raw = await req.text();
  const got = req.headers.get('x-nafaa-signature') ?? '';
  const want = createHmac('sha256', secret).update(raw).digest('hex');
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  let body: { storeId?: string; tags?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 });
  }
  const storeId = String(body.storeId ?? '');
  const tags = (Array.isArray(body.tags) ? body.tags : []).map(String).filter((t) => t === `store:${storeId}` || t.startsWith(`store:${storeId}:`)).slice(0, 100);
  if (!storeId || !tags.length) return NextResponse.json({ error: 'Nothing to revalidate' }, { status: 400 });
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ revalidated: tags, now: Date.now() });
}
