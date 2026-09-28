/**
 * WooCommerce REST API (wc/v3) — sirf wo cheezein jo Nafaa ko chahiye.
 *
 * Auth: HTTPS par consumer key/secret Basic auth me. Sirf dev me (http://)
 * query string me jate hain — WooCommerce http par Basic auth nahi maanta.
 */
export class WooClient {
  constructor(
    private readonly siteUrl: string,
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
  ) {}

  private url(path: string, query: Record<string, string | number | undefined> = {}) {
    const u = new URL(`${this.siteUrl.replace(/\/+$/, '')}/wp-json/wc/v3${path}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
    if (u.protocol === 'http:') {
      u.searchParams.set('consumer_key', this.consumerKey);
      u.searchParams.set('consumer_secret', this.consumerSecret);
    }
    return u.toString();
  }

  async request<T = any>(method: string, path: string, opts: { query?: Record<string, any>; body?: any; timeoutMs?: number } = {}): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    try {
      const res = await fetch(this.url(path, opts.query), {
        method,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Nafaa-POS/1.0',
          ...(opts.body !== undefined && { 'Content-Type': 'application/json' }),
          ...(this.siteUrl.startsWith('https:') && {
            Authorization: 'Basic ' + Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64'),
          }),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
        redirect: 'follow',
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!res.ok) {
        const msg = data?.message ?? `WooCommerce ne ${res.status} diya`;
        throw new WooError(msg, res.status, data?.code);
      }
      return data as T;
    } catch (e: any) {
      if (e instanceof WooError) throw e;
      throw new WooError(e?.name === 'AbortError' ? 'Website ne waqt par jawab nahi diya' : `Website tak nahi pahunch sake: ${e?.message ?? 'network'}`, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sab pages ek saath (hadd: maxPages × 100) */
  async all<T = any>(path: string, query: Record<string, any> = {}, maxPages = 30): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const rows = await this.request<T[]>('GET', path, { query: { per_page: 100, page, ...query } });
      if (!Array.isArray(rows) || rows.length === 0) break;
      out.push(...rows);
      if (rows.length < 100) break;
    }
    return out;
  }

  /** Keys sahi hain? (sab se halki request) */
  ping() {
    return this.request('GET', '/orders', { query: { per_page: 1, _fields: 'id' }, timeoutMs: 15_000 });
  }
}

export class WooError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}
