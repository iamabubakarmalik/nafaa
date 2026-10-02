import * as crypto from 'crypto';
import type { RemoteProduct } from './channel-catalog.service';

/* ═════════════════════════════════════════════════════════════
   INDOLJ — restaurant ordering platform (console.indolj.io/docs).
   Menu: GET {base}/api/merchant/menu/{activation_token}
         Authorization: Bearer <JWT HS512, merchant ki secret se>
   Har item ke prices[] = sizes (Nafaa variants); pos_code = SKU.
   ═════════════════════════════════════════════════════════════ */

export interface IndoljCreds { baseUrl: string; activationToken: string; merchantId: string; secret: string; branchId?: string | null }

export function indoljJwt(c: Pick<IndoljCreds, 'merchantId' | 'secret' | 'branchId'>, now = Math.floor(Date.now() / 1000)) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
  const payload: Record<string, unknown> = { iat: now, exp: now + 3600 };
  if (c.merchantId) payload.merchant_id = /^\d+$/.test(c.merchantId) ? Number(c.merchantId) : c.merchantId;
  if (c.branchId) payload.branch_id = /^\d+$/.test(c.branchId) ? Number(c.branchId) : c.branchId;
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha512', c.secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

const s = (v: unknown) => { const t = String(v ?? '').trim(); return t || null; };
const n = (v: unknown) => { const x = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : 0; };
const img = (v: unknown) => { const u = s(v); return u && /^https?:\/\//.test(u) ? u : null; };

/** Indolj menu (details{category{items{…}}}) → Nafaa ke Products safhe ki shakal */
export function indoljMenuToProducts(body: any): RemoteProduct[] {
  const details = body?.details ?? body?.data ?? {};
  const out: RemoteProduct[] = [];
  const seen = new Set<string>();
  for (const [catKey, cat] of Object.entries<any>(details)) {
    if (catKey === '01') continue; // "Popular items" — doosri categories ki nakal
    for (const item of Object.values<any>(cat?.items ?? {})) {
      const id = s(item?.item_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const prices: any[] = Array.isArray(item?.prices) ? item.prices : [];
      const image = img(item?.photo);
      const multi = prices.length > 1;
      out.push({
        externalProductId: id,
        title: s(item?.item_name) ?? `Item ${id}`,
        image,
        status: Number(item?.not_available) === 2 || cat?.out_of_stock === true ? 'unavailable' : 'active',
        hasVariants: multi,
        variants: (prices.length ? prices : [{}]).map((p) => ({
          externalVariantId: multi ? s(p?.size_id) : null,
          title: multi ? s(p?.size) ?? `#${p?.size_id}` : 'Default',
          sku: s(p?.size_pos_code) ?? s(item?.pos_code),
          barcode: null,
          price: n(p?.price),
          stock: null,
          image,
        })),
      });
    }
  }
  return out;
}

export async function fetchIndoljMenu(c: IndoljCreds): Promise<RemoteProduct[]> {
  const base = c.baseUrl.replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${base}/api/merchant/menu/${encodeURIComponent(c.activationToken)}`, {
      headers: { Authorization: `Bearer ${indoljJwt(c)}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* */ }
    if (!res.ok || body?.success === false) {
      const why = body?.message ?? (res.status === 401 ? 'JWT ghalat (secret / merchant ID check karein)' : res.status === 404 ? 'Merchant / activation token nahi mila' : res.status === 403 ? 'Indolj ne menu access band rakha hai' : `HTTP ${res.status}`);
      throw new Error(`Indolj: ${why}`);
    }
    return indoljMenuToProducts(body);
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Indolj ne 20 second me jawab nahi diya');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
