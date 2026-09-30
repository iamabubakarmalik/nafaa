import { AcctAccount, AcctAdapter, AcctApiError, AcctConnection, AcctTokens } from './types';

/**
 * Zoho Books v3. Kai data center (.com, .in, .eu…) — callback me
 * `accounts-server` aata hai; sirf Zoho ki apni list wala maante hain.
 * Token ghalti bhi HTTP 200 + { error } me aati hai. Header:
 * "Authorization: Zoho-oauthtoken <token>". Har call ?organization_id=.
 */
const SCOPES = 'ZohoBooks.accountants.READ,ZohoBooks.accountants.CREATE,ZohoBooks.settings.READ';
const ACCOUNTS_SERVERS = new Set([
  'https://accounts.zoho.com', 'https://accounts.zoho.eu', 'https://accounts.zoho.in', 'https://accounts.zoho.com.au',
  'https://accounts.zoho.jp', 'https://accounts.zohocloud.ca', 'https://accounts.zoho.sa', 'https://accounts.zoho.uk',
  'https://accounts.zoho.sg', 'https://accounts.zoho.ae', 'https://accounts.zohohq.in',
]);
const LOCATION_TLD: Record<string, string> = { us: 'com', eu: 'eu', in: 'in', au: 'com.au', jp: 'jp', ca: 'ca', sa: 'sa', uk: 'uk', ae: 'ae', sg: 'sg' };

const clientId = () => process.env.ZOHO_CLIENT_ID ?? '';
const clientSecret = () => process.env.ZOHO_CLIENT_SECRET ?? '';

async function token(server: string, params: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(`${server}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AcctApiError('Zoho tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  if (!b || b.error || !b.access_token) {
    const e = String(b?.error ?? `HTTP ${res.status}`);
    throw new AcctApiError(/invalid_code|invalid_client|access denied/i.test(e) ? `Zoho ne ijazat nahi di (${e}) — dobara "Jorein" dabayein` : `Zoho: ${e}`, true);
  }
  return b;
}

async function api(conn: AcctConnection, path: string, init: { method?: string; json?: unknown; query?: Record<string, string> } = {}) {
  const q = new URLSearchParams({ ...(conn.orgId ? { organization_id: conn.orgId } : {}), ...(init.query ?? {}) });
  let res: Response;
  try {
    res = await fetch(`${conn.apiBase}${path}?${q}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Zoho-oauthtoken ${conn.accessToken}`, Accept: 'application/json', ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new AcctApiError('Zoho Books tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  if (!b || Number(b.code) !== 0) {
    const code = Number(b?.code);
    throw new AcctApiError(code === 57 || code === 14 || res.status === 401 ? 'Zoho Books ki ijazat khatam — dobara jorein' : `Zoho Books: ${String(b?.message ?? `HTTP ${res.status}`).slice(0, 200)}`, code === 57 || code === 14 || res.status === 401);
  }
  return b;
}

/** Books ka base: api_domain sirf www.zohoapis.* ho to, warna location se */
export function zohoBooksBase(apiDomain?: string | null, location?: string | null) {
  if (apiDomain && /^https:\/\/www\.zohoapis\.[a-z.]+$/.test(apiDomain)) return `${apiDomain}/books/v3`;
  return `https://www.zohoapis.${LOCATION_TLD[String(location ?? 'us')] ?? 'com'}/books/v3`;
}

export const zohoAdapter: AcctAdapter = {
  code: 'ZOHO',
  name: 'Zoho Books',
  configured: () => !!(clientId() && clientSecret()),

  authorizeUrl(state, redirectUri) {
    const q = new URLSearchParams({ scope: SCOPES, client_id: clientId(), response_type: 'code', redirect_uri: redirectUri, access_type: 'offline', prompt: 'consent', state });
    return `https://accounts.zoho.com/oauth/v2/auth?${q}`;
  },

  async exchange(query, redirectUri) {
    const server = String(query['accounts-server'] ?? 'https://accounts.zoho.com').replace(/\/+$/, '');
    if (!ACCOUNTS_SERVERS.has(server)) throw new AcctApiError('Zoho ka server pehchana nahi — dobara jorein');
    if (!query.code) throw new AcctApiError(query.error ? `Zoho: ${query.error}` : 'Zoho par "Accept" nahi dabaya');
    const t = await token(server, { grant_type: 'authorization_code', client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri, code: String(query.code) });
    const conn: AcctConnection = {
      provider: 'ZOHO', accessToken: t.access_token, refreshToken: t.refresh_token ?? '', expiresAt: new Date(Date.now() + (Number(t.expires_in ?? 3600) - 300) * 1000).toISOString(),
      orgId: '', companyName: null, currency: null, apiBase: zohoBooksBase(t.api_domain, query.location), accountsServer: server,
    };
    if (!conn.refreshToken) throw new AcctApiError('Zoho ne refresh token nahi diya — dobara jorein');
    // organizations par organization_id nahi lagta (orgId khali)
    const orgs: any[] = (await api(conn, '/organizations'))?.organizations ?? [];
    const org = orgs.find((o) => o.is_default_org) ?? orgs[0];
    if (!org) throw new AcctApiError('Zoho Books me koi organization nahi — pehle Zoho Books me company banayein');
    const { provider, ...rest } = conn;
    return { ...rest, orgId: String(org.organization_id), companyName: org.name ?? null, currency: org.currency_code ?? null };
  },

  async refresh(conn): Promise<AcctTokens> {
    const t = await token(conn.accountsServer ?? 'https://accounts.zoho.com', { grant_type: 'refresh_token', refresh_token: conn.refreshToken, client_id: clientId(), client_secret: clientSecret() });
    // Zoho refresh par naya refresh token nahi deta — purana hi chalta hai
    return { accessToken: t.access_token, refreshToken: conn.refreshToken, expiresAt: new Date(Date.now() + (Number(t.expires_in ?? 3600) - 300) * 1000).toISOString() };
  },

  async accounts(conn): Promise<AcctAccount[]> {
    const out: AcctAccount[] = [];
    for (let page = 1; page <= 20; page++) {
      const b = await api(conn, '/chartofaccounts', { query: { filter_by: 'AccountType.Active', page: String(page), per_page: '200' } });
      for (const a of (b.chartofaccounts ?? []) as any[]) out.push({ id: String(a.account_id), name: String(a.account_name), code: a.account_code ?? null, type: String(a.account_type ?? '') });
      if (!b.page_context?.has_more_page) break;
    }
    return out;
  },

  async postJournal(conn, j) {
    const b = await api(conn, '/journals', {
      method: 'POST',
      json: {
        journal_date: j.date,
        reference_number: j.ref,
        notes: j.notes.slice(0, 500),
        journal_type: 'both',
        status: 'published',
        line_items: j.lines.map((l) => ({ account_id: l.accountId, debit_or_credit: l.side, amount: l.amount, description: l.description.slice(0, 100) })),
      },
    });
    const id = b?.journal?.journal_id;
    if (!id) throw new AcctApiError('Zoho ne journal number nahi diya');
    return { id: String(id) };
  },

  async findByRef(conn, ref) {
    const b = await api(conn, '/journals', { query: { reference_number: ref } }).catch(() => null);
    const hit = (b?.journals ?? []).find((x: any) => x.reference_number === ref);
    return hit ? String(hit.journal_id) : null;
  },
};
