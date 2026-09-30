import * as crypto from 'crypto';
import { AcctAccount, AcctAdapter, AcctApiError, AcctConnection, AcctTokens } from './types';

/**
 * Xero. OAuth: access 30 min, refresh 60 din (har refresh par naya). Nayi
 * apps ke liye granular scopes (accounting.manualjournals). ManualJournals:
 * debit +, credit −, Status POSTED (warna DRAFT). BANK aur system accounts
 * (AR/AP/Retained Earnings) manual journal me NAHI chalte — is liye list me
 * sirf woh accounts jin ka Code ho aur jo bank / system na hon; payment
 * tareeqon ke liye "clearing" (CURRENT) accounts.
 */
const AUTH = 'https://login.xero.com/identity/connect/authorize';
const TOKEN = 'https://identity.xero.com/connect/token';
const API = 'https://api.xero.com/api.xro/2.0';
const SCOPES = 'openid profile email offline_access accounting.settings.read accounting.manualjournals';
const cid = () => process.env.XERO_CLIENT_ID ?? '';
const secret = () => process.env.XERO_CLIENT_SECRET ?? '';

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
    throw new AcctApiError('Xero tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  if (!res.ok || !b?.access_token) throw new AcctApiError(`Xero ne ijazat nahi di (${b?.error ?? res.status}) — dobara jorein`, true);
  return b;
}

function validation(b: any): string | null {
  const msgs = [
    ...((b?.Elements ?? []) as any[]).flatMap((e) => (e.ValidationErrors ?? []).map((v: any) => v.Message)),
    ...((b?.ManualJournals ?? []) as any[]).flatMap((m) => (m.ValidationErrors ?? []).map((v: any) => v.Message)),
  ].filter(Boolean);
  return msgs.length ? `Xero: ${msgs.slice(0, 3).join(' · ')}` : b?.Message ? `Xero: ${b.Message}` : null;
}

async function api(conn: AcctConnection, path: string, init: { method?: string; json?: unknown; query?: Record<string, string>; idem?: string } = {}) {
  const q = init.query ? `?${new URLSearchParams(init.query)}` : '';
  let res: Response;
  try {
    res = await fetch(`${API}${path}${q}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${conn.accessToken}`, 'xero-tenant-id': conn.orgId, Accept: 'application/json',
        ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.idem ? { 'Idempotency-Key': init.idem } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AcctApiError('Xero tak nahi pahunch sake');
  }
  const b: any = await res.json().catch(() => null);
  if (!res.ok) {
    const auth = res.status === 401 || res.status === 403;
    throw new AcctApiError(auth ? 'Xero ki ijazat khatam — dobara jorein' : res.status === 503 ? 'Xero organisation abhi offline hai — 5 minute baad' : validation(b) ?? `Xero: HTTP ${res.status}`, auth);
  }
  return b;
}

const exp = (secs: number) => new Date(Date.now() + (Number(secs || 1800) - 120) * 1000).toISOString();
/** Narration hamesha ek jaisi — isi se "pehle se bheja?" dekhte hain */
export const xeroNarration = (ref: string) => `${ref} · Nafaa POS roz ka hisaab`;

export const xeroAdapter: AcctAdapter = {
  code: 'XERO',
  name: 'Xero',
  configured: () => !!(cid() && secret()),

  authorizeUrl(state, redirectUri) {
    return `${AUTH}?${new URLSearchParams({ response_type: 'code', client_id: cid(), redirect_uri: redirectUri, scope: SCOPES, state })}`;
  },

  async exchange(query, redirectUri) {
    if (!query.code) throw new AcctApiError(query.error ? `Xero: ${query.error}` : 'Xero par "Allow access" nahi dabaya');
    const t = await token({ grant_type: 'authorization_code', code: String(query.code), redirect_uri: redirectUri });
    const res = await fetch('https://api.xero.com/connections', { headers: { Authorization: `Bearer ${t.access_token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    const raw: unknown = await res?.json().catch(() => null);
    const list: any[] = Array.isArray(raw) ? raw : [];
    const org = list.filter((c) => c.tenantType === 'ORGANISATION').sort((a, b) => String(b.createdDateUtc).localeCompare(String(a.createdDateUtc)))[0];
    if (!org?.tenantId) throw new AcctApiError('Xero me koi organisation nahi mili');
    const conn: AcctConnection = { provider: 'XERO', accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: exp(t.expires_in), orgId: String(org.tenantId), companyName: org.tenantName ?? null, currency: null };
    const o = await api(conn, '/Organisation').catch(() => null);
    const { provider, ...rest } = conn;
    return { ...rest, companyName: o?.Organisations?.[0]?.Name ?? conn.companyName, currency: o?.Organisations?.[0]?.BaseCurrency ?? null };
  },

  async refresh(conn): Promise<AcctTokens> {
    const t = await token({ grant_type: 'refresh_token', refresh_token: conn.refreshToken });
    return { accessToken: t.access_token, refreshToken: t.refresh_token ?? conn.refreshToken, expiresAt: exp(t.expires_in) };
  },

  /** Sirf manual journal me chalne wale: Code ho, BANK / system na ho, ACTIVE */
  async accounts(conn): Promise<AcctAccount[]> {
    const b = await api(conn, '/Accounts');
    return ((b?.Accounts ?? []) as any[])
      .filter((a) => a.Status === 'ACTIVE' && a.Code && a.Type !== 'BANK' && !a.SystemAccount)
      .map((a) => ({ id: String(a.Code), name: String(a.Name), code: String(a.Code), type: String(a.Type) }));
  },

  async postJournal(conn, j) {
    const b = await api(conn, '/ManualJournals', {
      method: 'PUT',
      idem: `nafaa-${j.ref}-${crypto.createHash('sha1').update(JSON.stringify(j.lines)).digest('hex').slice(0, 16)}`,
      json: {
        ManualJournals: [{
          Narration: xeroNarration(j.ref),
          Date: j.date,
          Status: 'POSTED',
          LineAmountTypes: 'NoTax',
          JournalLines: j.lines.map((l) => ({
            LineAmount: l.side === 'debit' ? l.amount : -l.amount,
            AccountCode: l.accountId,
            Description: l.description.slice(0, 250),
          })),
        }],
      },
    });
    const m = b?.ManualJournals?.[0];
    const err = validation(b);
    if (!m?.ManualJournalID || (m.ValidationErrors ?? []).length) throw new AcctApiError(err ?? 'Xero ne journal nahi banaya');
    return { id: String(m.ManualJournalID) };
  },

  async findByRef(conn, ref) {
    const b = await api(conn, '/ManualJournals', { query: { where: `Narration=="${xeroNarration(ref).replace(/"/g, '')}"` } }).catch(() => null);
    const hit = ((b?.ManualJournals ?? []) as any[]).find((m) => m.Status !== 'VOIDED' && m.Status !== 'DELETED');
    return hit ? String(hit.ManualJournalID) : null;
  },
};
