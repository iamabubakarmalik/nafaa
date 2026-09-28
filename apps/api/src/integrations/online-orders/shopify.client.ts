/**
 * Shopify Admin GraphQL API — sirf wo cheezein jo Nafaa ko chahiye.
 * Throttle (bucket khali) par thora ruk kar dobara koshish karta hai.
 */
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';

export const SHOPIFY_SCOPES = [
  'read_orders', 'write_orders',
  'read_products', 'write_products',
  'read_inventory', 'write_inventory',
  'read_locations',
  'read_merchant_managed_fulfillment_orders', 'write_merchant_managed_fulfillment_orders',
].join(',');

export class ShopifyError extends Error {
  constructor(message: string, readonly status = 0, readonly details?: any) {
    super(message);
  }
}

export const orderGid = (id: string | number) => (String(id).startsWith('gid://') ? String(id) : `gid://shopify/Order/${id}`);
export const numericId = (gid: string) => String(gid).split('/').pop() ?? gid;

export class ShopifyClient {
  constructor(private readonly shop: string, private readonly token: string) {}

  async graphql<T = any>(query: string, variables: Record<string, any> = {}, attempt = 0): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(`https://${this.shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Shopify-Access-Token': this.token,
          'User-Agent': 'Nafaa-POS/1.0',
        },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      throw new ShopifyError(e?.name === 'AbortError' ? 'Shopify ne waqt par jawab nahi diya' : `Shopify tak nahi pahunch sake: ${e?.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return this.graphql<T>(query, variables, attempt + 1);
    }
    const text = await res.text().catch(() => '');
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (res.status === 401 || res.status === 403) {
      // Shopify ka asal paigham bhi dikhao — "access nahi diya" akela kuch nahi batata
      const why = typeof body?.errors === 'string' ? body.errors
        : body?.errors?.[0]?.message ?? (text ? text.slice(0, 160) : '');
      const reqId = res.headers.get('x-request-id');
      throw new ShopifyError(
        `Shopify ne ${res.status} diya${why ? `: ${why}` : ''}${reqId ? ` (request ${reqId})` : ''}`,
        res.status,
        body,
      );
    }
    if (!res.ok) throw new ShopifyError(body?.errors?.[0]?.message ?? `Shopify ne ${res.status} diya`, res.status, body);

    const errors: any[] = body?.errors ?? [];
    if (errors.some((e) => e?.extensions?.code === 'THROTTLED') && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return this.graphql<T>(query, variables, attempt + 1);
    }
    if (errors.length) throw new ShopifyError(errors.map((e) => e.message).join('; '), res.status, errors);
    return body.data as T;
  }

  /** Mutation chalao aur userErrors ho to saaf error do */
  async mutate<T = any>(query: string, variables: Record<string, any>, key: string): Promise<T> {
    const data: any = await this.graphql(query, variables);
    const payload = data?.[key];
    const userErrors: any[] = payload?.userErrors ?? [];
    if (userErrors.length) throw new ShopifyError(userErrors.map((e) => e.message).join('; '), 422, userErrors);
    return payload as T;
  }

  /** Token asal me kaam karta hai? Aur kaunse scopes mile? (REST — sab se seedha check) */
  async accessScopes(): Promise<{ status: number; scopes: string[]; error?: string }> {
    try {
      const res = await fetch(`https://${this.shop}/admin/oauth/access_scopes.json`, {
        headers: { 'X-Shopify-Access-Token': this.token, Accept: 'application/json' },
      });
      const text = await res.text();
      let body: any = null;
      try { body = JSON.parse(text); } catch { /* html */ }
      if (!res.ok) return { status: res.status, scopes: [], error: (typeof body?.errors === 'string' ? body.errors : text.slice(0, 160)) || `HTTP ${res.status}` };
      return { status: res.status, scopes: (body?.access_scopes ?? []).map((x: any) => x.handle) };
    } catch (e: any) {
      return { status: 0, scopes: [], error: e?.message };
    }
  }

  /** Cursor wali list — sab pages (hadd ke saath) */
  async paginate<T = any>(query: string, path: string, variables: Record<string, any> = {}, maxPages = 40): Promise<T[]> {
    const out: T[] = [];
    let after: string | null = null;
    for (let i = 0; i < maxPages; i++) {
      const data: any = await this.graphql(query, { ...variables, after });
      const conn = path.split('.').reduce((o, k) => o?.[k], data);
      out.push(...(conn?.nodes ?? []));
      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
    return out;
  }
}
