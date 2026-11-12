import {
  REMOVED_BY_NAFAA, SubdomainState, hostingKey, isRemovedByNafaa, readSubdomainState, storeIdOfHostingKey, subdomainDue, subdomainPlan, subdomainView,
} from './lib/hosting';

const state = (over: Partial<SubdomainState> = {}): SubdomainState => ({
  host: 'hiba.stores.nafaa.pk', status: 'PENDING', attached: true, error: null, since: new Date(0).toISOString(), checkedAt: null, ...over,
});

describe('free subdomain hosting', () => {
  const env = process.env.STORE_ROOT_DOMAIN;
  beforeAll(() => { delete process.env.STORE_ROOT_DOMAIN; });
  afterAll(() => { if (env !== undefined) process.env.STORE_ROOT_DOMAIN = env; });

  it('attaches nothing without the Vercel env', () => {
    expect(subdomainPlan({ ready: false, slug: 'hiba' })).toEqual({ attach: [], detach: null });
    expect(subdomainPlan({ ready: false, slug: 'hiba-new', previousSlug: 'hiba' })).toEqual({ attach: [], detach: null });
  });

  it('attaches the root once and the store subdomain on create', () => {
    expect(subdomainPlan({ ready: true, slug: 'hiba' })).toEqual({ attach: ['stores.nafaa.pk', 'hiba.stores.nafaa.pk'], detach: null });
    const rootState = state({ host: 'stores.nafaa.pk', status: 'PENDING', attached: true });
    expect(subdomainPlan({ ready: true, slug: 'hiba', rootState })).toEqual({ attach: ['hiba.stores.nafaa.pk'], detach: null });
    // Root attach failed earlier: try again.
    expect(subdomainPlan({ ready: true, slug: 'hiba', rootState: { ...rootState, attached: false } }).attach).toContain('stores.nafaa.pk');
  });

  it('skips a subdomain that is already live, retries one that is not', () => {
    const rootState = state({ host: 'stores.nafaa.pk', status: 'ACTIVE' });
    expect(subdomainPlan({ ready: true, slug: 'hiba', rootState, state: state({ status: 'ACTIVE' }) }).attach).toEqual([]);
    expect(subdomainPlan({ ready: true, slug: 'hiba', rootState, state: state({ status: 'PENDING' }) }).attach).toEqual(['hiba.stores.nafaa.pk']);
  });

  it('attaches the new subdomain on a slug change and plans the old one for detach', () => {
    const rootState = state({ host: 'stores.nafaa.pk', status: 'ACTIVE' });
    expect(subdomainPlan({ ready: true, slug: 'hiba-e-store', previousSlug: 'hiba', rootState, state: state({ status: 'ACTIVE' }) }))
      .toEqual({ attach: ['hiba-e-store.stores.nafaa.pk'], detach: 'hiba.stores.nafaa.pk' });
    expect(subdomainPlan({ ready: true, slug: 'hiba', previousSlug: 'hiba', rootState }).detach).toBeNull();
  });

  it('follows STORE_ROOT_DOMAIN', () => {
    process.env.STORE_ROOT_DOMAIN = 'shops.example.pk';
    try {
      expect(subdomainPlan({ ready: true, slug: 'hiba', rootState: state({ host: 'stores.nafaa.pk', status: 'ACTIVE' }) }).attach)
        .toEqual(['shops.example.pk', 'hiba.shops.example.pk']);
    } finally {
      delete process.env.STORE_ROOT_DOMAIN;
    }
  });

  it('backs off retries as a pending subdomain ages', () => {
    const now = Date.parse('2026-11-12T12:00:00Z');
    const ago = (ms: number) => new Date(now - ms).toISOString();
    expect(subdomainDue(state({ checkedAt: null }), now)).toBe(true);
    expect(subdomainDue(state({ since: ago(10 * 60_000), checkedAt: ago(60_000) }), now)).toBe(false);
    expect(subdomainDue(state({ since: ago(10 * 60_000), checkedAt: ago(5 * 60_000) }), now)).toBe(true);
    expect(subdomainDue(state({ since: ago(2 * 86_400_000), checkedAt: ago(60 * 60_000) }), now)).toBe(false);
    expect(subdomainDue(state({ since: ago(2 * 86_400_000), checkedAt: ago(6 * 3_600_000) }), now)).toBe(true);
    expect(subdomainDue(state({ status: 'ACTIVE' }), now)).toBe(false);
    expect(subdomainDue(state({ status: 'GONE' }), now)).toBe(false);
  });

  it('shows the merchant a status only when hosting is set up', () => {
    expect(subdomainView(false, 'hiba.stores.nafaa.pk', state({ status: 'ACTIVE' }))).toBeNull();
    expect(subdomainView(true, 'hiba.stores.nafaa.pk', state({ status: 'ACTIVE' }))).toBe('ACTIVE');
    expect(subdomainView(true, 'new.stores.nafaa.pk', state({ status: 'ACTIVE' }))).toBe('PENDING');
    expect(subdomainView(true, 'hiba.stores.nafaa.pk', null)).toBe('PENDING');
  });

  it('reads saved state defensively and maps keys', () => {
    expect(readSubdomainState(null)).toBeNull();
    expect(readSubdomainState('not json')).toBeNull();
    expect(readSubdomainState(JSON.stringify({ host: 'a.stores.nafaa.pk', status: 'weird' }))?.status).toBe('PENDING');
    expect(JSON.stringify(state())).toContain('"status":"PENDING"');
    expect(storeIdOfHostingKey(hostingKey('abc'))).toBe('abc');
    expect(storeIdOfHostingKey('stores_platform_controls')).toBeNull();
  });
});

describe('domains removed by Nafaa', () => {
  it('recognises only the admin mark', () => {
    expect(isRemovedByNafaa({ error: REMOVED_BY_NAFAA })).toBe(true);
    expect(isRemovedByNafaa({ error: 'Domain nahi jur saka' })).toBe(false);
    expect(isRemovedByNafaa({ error: null })).toBe(false);
  });
});
