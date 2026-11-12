/**
 * On-demand revalidation, called by the Nafaa API when a shop's products,
 * prices, stock, theme, menus or pages change (contract 1.12).
 *
 * Header x-nafaa-signature = hex HMAC-SHA256 of the raw body with
 * STOREFRONT_REVALIDATE_SECRET. Body { storeId, tags: string[], at }.
 * Tags are the ones lib/api.ts puts on its fetches (store:<id>, ...).
 * `resolve:<slug|host>` tags (host lookups, cached 60 s) are taken only
 * when the API says that slug or host belongs to the same store, so one
 * store can never clear another store's lookups.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const API = (process.env.NAFAA_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const MAX_RESOLVE = 20;

/** True when the API resolves this slug (no dot) or host to `storeId`. */
async function ownsKey(storeId: string, key: string): Promise<boolean> {
  if (!/^[a-z0-9.-]{1,253}$/.test(key)) return false;
  try {
    const q = new URLSearchParams(key.includes('.') ? { host: key } : { slug: key });
    const res = await fetch(`${API}/storefront/v1/resolve?${q}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { storeId?: string }; storeId?: string };
    return (json.data?.storeId ?? json.storeId) === storeId;
  } catch {
    return false;
  }
}

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
  const all = (Array.isArray(body.tags) ? body.tags : []).map(String);
  const tags = all.filter((t) => t === `store:${storeId}` || t.startsWith(`store:${storeId}:`)).slice(0, 100);
  if (storeId) {
    const keys = [...new Set(all.filter((t) => t.startsWith('resolve:')).map((t) => t.slice('resolve:'.length).toLowerCase()))].slice(0, MAX_RESOLVE);
    const owned = await Promise.all(keys.map(async (k) => ((await ownsKey(storeId, k)) ? `resolve:${k}` : null)));
    for (const t of owned) if (t) tags.push(t);
  }
  if (!storeId || !tags.length) return NextResponse.json({ error: 'Nothing to revalidate' }, { status: 400 });
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ revalidated: tags, now: Date.now() });
}
