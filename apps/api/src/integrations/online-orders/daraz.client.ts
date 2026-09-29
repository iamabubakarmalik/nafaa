import * as crypto from 'crypto';

/**
 * Daraz Open Platform (IOP) client — Pakistan gateway api.daraz.pk/rest.
 * Har request par sign: api path + saare params (sign ke siwa) key ke
 * ASCII tarteeb se "key+value" jor kar, HMAC-SHA256 (app secret), UPPER hex.
 * Jawab hamesha HTTP 200: kamyabi code "0", warna { code, message }.
 */
export const DARAZ_API = 'https://api.daraz.pk/rest';
export const DARAZ_AUTHORIZE = 'https://api.daraz.pk/oauth/authorize';

export class DarazError extends Error {
  constructor(message: string, readonly code: string, readonly auth = false) {
    super(message);
  }
}

export function darazSign(path: string, params: Record<string, string>, secret: string) {
  const str = path + Object.keys(params).filter((k) => k !== 'sign').sort().map((k) => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

const AUTH_CODES = new Set(['IllegalAccessToken', 'InvalidAccessToken', 'AccessTokenExpired', 'InvalidAppKey', 'MissingAccessToken', 'IncompleteSignature', 'InvalidSignature']);

export class DarazClient {
  constructor(private readonly appKey: string, private readonly appSecret: string, private readonly accessToken?: string | null) {}

  async call<T = any>(path: string, params: Record<string, unknown> = {}, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    const p: Record<string, string> = {
      app_key: this.appKey,
      timestamp: String(Date.now()),
      sign_method: 'sha256',
      ...(this.accessToken ? { access_token: this.accessToken } : {}),
    };
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue; // khali param na bhejo (sign me farq)
      p[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    p.sign = darazSign(path, p, this.appSecret);
    const body = new URLSearchParams(p);
    let res: Response;
    try {
      res = await fetch(method === 'GET' ? `${DARAZ_API}${path}?${body}` : `${DARAZ_API}${path}`, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' } : undefined,
        body: method === 'POST' ? body.toString() : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e: any) {
      throw new DarazError(e?.name === 'TimeoutError' ? 'Daraz ne waqt par jawab nahi diya' : 'Daraz tak nahi pahunch sake', 'Network');
    }
    const json: any = await res.json().catch(() => null);
    if (!json) throw new DarazError(`Daraz ka jawab samajh nahi aaya (HTTP ${res.status})`, 'BadResponse');
    if (String(json.code ?? '0') !== '0') {
      const code = String(json.code);
      throw new DarazError(`Daraz: ${String(json.message ?? code).slice(0, 200)}`, code, AUTH_CODES.has(code));
    }
    return json as T;
  }

  /** code → tokens (auth endpoints par access_token nahi jata) */
  createToken(code: string) {
    return this.call<any>('/auth/token/create', { code });
  }

  refreshToken(refreshToken: string) {
    return this.call<any>('/auth/token/refresh', { refresh_token: refreshToken });
  }
}

/** Token jawab — docs me kabhi user_info (object), kabhi country_user_info (array) */
export function readTokenResponse(t: any) {
  const info = Array.isArray(t?.country_user_info) ? t.country_user_info.find((x: any) => x?.country === 'pk') ?? t.country_user_info[0]
    : t?.country_user_info ?? t?.user_info ?? {};
  const now = Date.now();
  return {
    accessToken: String(t?.access_token ?? ''),
    refreshToken: String(t?.refresh_token ?? ''),
    expiresAt: new Date(now + Number(t?.expires_in ?? 0) * 1000).toISOString(),
    refreshExpiresAt: new Date(now + Number(t?.refresh_expires_in ?? 0) * 1000).toISOString(),
    account: t?.account ? String(t.account) : null,
    country: t?.country ? String(t.country) : 'pk',
    sellerId: info?.seller_id ? String(info.seller_id) : null,
    shortCode: info?.short_code ? String(info.short_code) : null,
  };
}

/** Stock update ka XML (single-warehouse) — 20 SKU tak ek request */
export function stockXml(rows: { itemId: string; skuId: string; sellerSku: string; quantity: number }[]) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const skus = rows.map((r) =>
    `<Sku><ItemId>${esc(r.itemId)}</ItemId><SkuId>${esc(r.skuId)}</SkuId><SellerSku>${esc(r.sellerSku)}</SellerSku><Quantity>${Math.max(0, Math.floor(r.quantity))}</Quantity></Sku>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" ?><Request><Product><Skus>${skus}</Skus></Product></Request>`;
}
