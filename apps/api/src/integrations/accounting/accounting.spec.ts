import { zohoAdapter, zohoBooksBase } from './zoho.adapter';
import { AccountingService, pkDayRange } from './accounting.service';
import { ACCT_PROVIDERS } from './registry';
import { encrypt } from '../../core/lib/crypto';

describe('Zoho adapter', () => {
  const realFetch = global.fetch;
  afterAll(() => { global.fetch = realFetch; });

  it('Books base: sirf www.zohoapis.*, warna location se', () => {
    expect(zohoBooksBase('https://www.zohoapis.in', 'in')).toBe('https://www.zohoapis.in/books/v3');
    expect(zohoBooksBase('https://api.zoho.eu', 'eu')).toBe('https://www.zohoapis.eu/books/v3');
    expect(zohoBooksBase(null, 'au')).toBe('https://www.zohoapis.com.au/books/v3');
  });

  it('ajnabi accounts-server rad', async () => {
    await expect(zohoAdapter.exchange({ code: 'x', 'accounts-server': 'https://evil.example.com' }, 'https://r')).rejects.toMatchObject({ message: expect.stringContaining('server') });
  });

  it('exchange: form token + default org', async () => {
    const calls: any[] = [];
    global.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/oauth/v2/token')) return new Response(JSON.stringify({ access_token: 'AT', refresh_token: 'RT', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }), { status: 200 });
      return new Response(JSON.stringify({ code: 0, organizations: [{ organization_id: '111', name: 'A', is_default_org: false }, { organization_id: '222', name: 'Key Phantom', currency_code: 'PKR', is_default_org: true }] }), { status: 200 });
    }) as any;
    const c = await zohoAdapter.exchange({ code: 'C', 'accounts-server': 'https://accounts.zoho.in', location: 'in' }, 'https://r');
    expect(calls[0].url).toBe('https://accounts.zoho.in/oauth/v2/token');
    expect(String(calls[0].init.body)).toContain('grant_type=authorization_code');
    expect(calls[1].url).toBe('https://www.zohoapis.in/books/v3/organizations?');
    expect(calls[1].init.headers.Authorization).toBe('Zoho-oauthtoken AT');
    expect(c).toMatchObject({ orgId: '222', companyName: 'Key Phantom', currency: 'PKR', refreshToken: 'RT', apiBase: 'https://www.zohoapis.in/books/v3' });
  });

  it('token ghalti HTTP 200 + error', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ error: 'invalid_code' }), { status: 200 })) as any;
    await expect(zohoAdapter.exchange({ code: 'C', 'accounts-server': 'https://accounts.zoho.com' }, 'https://r')).rejects.toMatchObject({ auth: true });
  });

  it('journal: published, both, debit_or_credit', async () => {
    const calls: any[] = [];
    global.fetch = (async (url: any, init: any) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify({ code: 0, journal: { journal_id: 'J1' } }), { status: 201 }); }) as any;
    const r = await zohoAdapter.postJournal({ provider: 'ZOHO', accessToken: 'AT', refreshToken: 'RT', expiresAt: '', orgId: '222', companyName: null, currency: null, apiBase: 'https://www.zohoapis.com/books/v3' },
      { date: '2026-09-29', ref: 'NAFAA-2026-09-29', notes: 'n', lines: [{ accountId: 'A', side: 'debit', amount: 100, description: 'x' }, { accountId: 'B', side: 'credit', amount: 100, description: 'y' }] });
    expect(r.id).toBe('J1');
    expect(calls[0].url).toBe('https://www.zohoapis.com/books/v3/journals?organization_id=222');
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ journal_date: '2026-09-29', reference_number: 'NAFAA-2026-09-29', journal_type: 'both', status: 'published', line_items: [{ account_id: 'A', debit_or_credit: 'debit', amount: 100 }, { account_id: 'B', debit_or_credit: 'credit', amount: 100 }] });
  });
});

describe('Accounting sync', () => {
  it('pkDayRange: Pakistan ka din', () => {
    const r = pkDayRange('2026-09-30');
    expect(r.start.toISOString()).toBe('2026-09-29T19:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-09-30T19:00:00.000Z');
  });

  function make(mapping: any) {
    const store: Record<string, string> = {};
    const posted: any[] = [];
    const conn = { provider: 'ZOHO', accessToken: 'AT', refreshToken: 'RT', expiresAt: new Date(Date.now() + 3600_000).toISOString(), orgId: '1', companyName: 'X', currency: 'PKR', apiBase: 'https://www.zohoapis.com/books/v3' };
    store['accounting:t1'] = JSON.stringify({ provider: 'ZOHO', conn: encrypt(JSON.stringify(conn)), companyName: 'X', currency: 'PKR', connectedAt: '', mapping, includeCogs: false, includeExpenses: true, autoSync: true, history: [] });
    const prisma: any = {
      systemSetting: { findUnique: async (q: any) => (store[q.where.key] ? { value: store[q.where.key] } : null), upsert: async (q: any) => { store[q.where.key] = q.update.value; } },
      sale: { findMany: async () => [{ subtotal: 1000, discount: 0, total: 1000, creditAmount: 0, paymentMethod: 'CASH', costOfGoods: 0 }] },
      saleReturn: { findMany: async () => [] },
      customerLedger: { findMany: async () => [] },
      expense: { findMany: async () => [] },
    };
    const real = ACCT_PROVIDERS.ZOHO;
    ACCT_PROVIDERS.ZOHO = { ...real, postJournal: async (_c: any, j: any) => { posted.push(j); return { id: `J${posted.length}` }; }, findByRef: async () => null } as any;
    return { svc: new AccountingService(prisma), posted, restore: () => { ACCT_PROVIDERS.ZOHO = real; } };
  }

  it('ek din ek hi dafa (dobara = SKIPPED), force se dobara', async () => {
    const { svc, posted, restore } = make({ sales: 'S', methods: { CASH: 'C' } });
    expect((await svc.syncDay('t1', '2026-09-29')).status).toBe('SUCCESS');
    expect((await svc.syncDay('t1', '2026-09-29')).status).toBe('SKIPPED');
    expect(posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ date: '2026-09-29', ref: 'NAFAA-2026-09-29' });
    await svc.syncDay('t1', '2026-09-29', { force: true });
    expect(posted.length).toBe(2);
    restore();
  });

  it('account na chuna ho to FAILED (kuch nahi bheja)', async () => {
    const { svc, posted, restore } = make({ sales: 'S' });
    const r = await svc.syncDay('t1', '2026-09-29');
    expect(r.status).toBe('FAILED');
    expect(r.error).toContain('Cash ka account');
    expect(posted.length).toBe(0);
    restore();
  });
});
