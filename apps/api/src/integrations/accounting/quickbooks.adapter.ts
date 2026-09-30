import * as crypto from 'crypto';
import { AcctAccount, AcctAdapter, AcctApiError, AcctConnection, AcctTokens } from './types';

/**
 * QuickBooks Online. OAuth: token par Basic auth; access 1 ghanta, refresh
 * 100 din (har refresh par naya — hamesha naya save). API minorversion 75.
 * JournalEntry: Line[].JournalEntryLineDetail.PostingType Debit|Credit,
 * DocNumber max 21. Accounts Receivable line par customer lazmi — is liye
 * udhaar ke liye alag "Other Current Asset" account behtar.
 */
const AUTH = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const MINOR = '75';
const base = () => (process.env.QBO_ENV === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com');
const cid = () => process.env.QBO_CLIENT_ID ?? '';
const secret = () => process.env.QBO_CLIENT_SECRET ?? '';

async function token(params: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(TOKEN, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${cid()}:${secret()}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AcctApiError('QuickBooks tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  if (!res.ok || !b?.access_token) throw new AcctApiError(`QuickBooks ne ijazat nahi di (${b?.error ?? res.status}) — dobara jorein`, true);
  return b;
}

function fault(b: any): string | null {
  const f = b?.Fault ?? b?.fault;
  const e = (f?.Error ?? f?.error ?? [])[0];
  if (!e) return null;
  const code = String(e.code ?? '');
  const msg = String(e.Detail ?? e.detail ?? e.Message ?? e.message ?? code);
  if (code === '6000' && /receivable/i.test(msg)) return 'QuickBooks: udhaar ke liye "Accounts Receivable" ki jagah ek alag "Other Current Asset" account (jaise POS Udhaar) chunein';
  return `QuickBooks: ${msg.slice(0, 200)}`;
}

async function api(conn: AcctConnection, path: string, init: { method?: string; json?: unknown; query?: Record<string, string> } = {}) {
  const q = new URLSearchParams({ minorversion: MINOR, ...(init.query ?? {}) });
  let res: Response;
  try {
    res = await fetch(`${base()}/v3/company/${conn.orgId}${path}?${q}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${conn.accessToken}`, Accept: 'application/json', ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AcctApiError('QuickBooks tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  const f = fault(b);
  if (!res.ok || f) {
    const auth = res.status === 401;
    throw new AcctApiError(auth ? 'QuickBooks ki ijazat khatam — dobara jorein' : f ?? `QuickBooks: HTTP ${res.status}`, auth);
  }
  return b;
}

const exp = (secs: number) => new Date(Date.now() + (Number(secs || 3600) - 300) * 1000).toISOString();

export const quickbooksAdapter: AcctAdapter = {
  code: 'QUICKBOOKS',
  name: 'QuickBooks',
  configured: () => !!(cid() && secret()),

  authorizeUrl(state, redirectUri) {
    return `${AUTH}?${new URLSearchParams({ client_id: cid(), response_type: 'code', scope: 'com.intuit.quickbooks.accounting', redirect_uri: redirectUri, state })}`;
  },

  async exchange(query, redirectUri) {
    if (!query.code || !query.realmId) throw new AcctApiError(query.error ? `QuickBooks: ${query.error}` : 'QuickBooks par "Connect" nahi dabaya');
    const t = await token({ grant_type: 'authorization_code', code: String(query.code), redirect_uri: redirectUri });
    const conn: AcctConnection = { provider: 'QUICKBOOKS', accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: exp(t.expires_in), orgId: String(query.realmId), companyName: null, currency: null };
    const [info, prefs] = await Promise.all([
      api(conn, `/companyinfo/${conn.orgId}`).catch(() => null),
      api(conn, '/preferences').catch(() => null),
    ]);
    const { provider, ...rest } = conn;
    return { ...rest, companyName: info?.CompanyInfo?.CompanyName ?? null, currency: prefs?.Preferences?.CurrencyPrefs?.HomeCurrency?.value ?? null };
  },

  async refresh(conn): Promise<AcctTokens> {
    const t = await token({ grant_type: 'refresh_token', refresh_token: conn.refreshToken });
    // Refresh token ghoomta hai — naya hi save karna zaroori
    return { accessToken: t.access_token, refreshToken: t.refresh_token ?? conn.refreshToken, expiresAt: exp(t.expires_in) };
  },

  async accounts(conn): Promise<AcctAccount[]> {
    const out: AcctAccount[] = [];
    for (let start = 1; start < 10_000; start += 1000) {
      const b = await api(conn, '/query', { query: { query: `select * from Account where Active = true STARTPOSITION ${start} MAXRESULTS 1000` } });
      const list: any[] = b?.QueryResponse?.Account ?? [];
      for (const a of list) out.push({ id: String(a.Id), name: String(a.FullyQualifiedName ?? a.Name), code: a.AcctNum ?? null, type: String(a.AccountType ?? '') });
      if (list.length < 1000) break;
    }
    return out;
  },

  async postJournal(conn, j) {
    const b = await api(conn, '/journalentry', {
      method: 'POST',
      query: { requestid: crypto.randomUUID() },
      json: {
        TxnDate: j.date,
        DocNumber: j.ref.slice(0, 21),
        PrivateNote: j.notes.slice(0, 4000),
        Line: j.lines.map((l) => ({
          Amount: l.amount,
          Description: l.description.slice(0, 4000),
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: { PostingType: l.side === 'debit' ? 'Debit' : 'Credit', AccountRef: { value: l.accountId } },
        })),
      },
    });
    const id = b?.JournalEntry?.Id;
    if (!id) throw new AcctApiError('QuickBooks ne journal number nahi diya');
    return { id: String(id) };
  },

  async findByRef(conn, ref) {
    const b = await api(conn, '/query', { query: { query: `select Id from JournalEntry where DocNumber = '${ref.replace(/'/g, '').slice(0, 21)}'` } }).catch(() => null);
    const hit = b?.QueryResponse?.JournalEntry?.[0];
    return hit ? String(hit.Id) : null;
  },
};
