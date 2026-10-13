import { maskSecrets, readSetup, routeFor, routingConflict, salesShopWhere, writeSetup, type TaxAuthorityConfig } from './tax-setup';

const profile = (o: Partial<TaxAuthorityConfig>): TaxAuthorityConfig => ({
  authority: 'PRA', enabled: true, env: 'sandbox', businessName: 'Ali', pctCode: '98012000', cashRate: 16, cardRate: 8, onlyPos: true,
  terminals: [{ shopId: null, posId: '1', ntn: '1', secret: null }], startAt: '2026-10-01T00:00:00.000Z', ...o,
});

describe('tax setup', () => {
  it('reads the old single-profile record and the new list', () => {
    const old = JSON.stringify(profile({ authority: 'KPRA', env: 'sandbox' }));
    expect(readSetup(old)).toHaveLength(1);
    expect(readSetup(old)[0]).toMatchObject({ authority: 'KPRA', env: 'live' });
    const both = writeSetup([profile({}), profile({ authority: 'SRB', terminals: [{ shopId: 'k', posId: '2', ntn: '2', secret: null }] })]);
    expect(readSetup(both).map((p) => p.authority)).toEqual(['PRA', 'SRB']);
    // Older builds read the top level
    expect(JSON.parse(both)).toMatchObject({ authority: 'PRA', enabled: true });
    expect(readSetup('not json')).toEqual([]);
  });

  it('routes a branch to its own authority before the all-branches one', () => {
    const list = [profile({}), profile({ authority: 'SRB', terminals: [{ shopId: 'karachi', posId: '9', ntn: '2', secret: null }] })];
    expect(routeFor(list, 'karachi')?.profile.authority).toBe('SRB');
    expect(routeFor(list, 'lahore')?.profile.authority).toBe('PRA');
    expect(routeFor([profile({ enabled: false })], 'lahore')).toBeNull();
    expect(salesShopWhere(list, list[0])).toEqual({ OR: [{ shopId: null }, { shopId: { notIn: ['karachi'] } }] });
    expect(salesShopWhere(list, list[1])).toEqual({ shopId: { in: ['karachi'] } });
  });

  it('refuses one branch in two enabled authorities', () => {
    expect(routingConflict([profile({}), profile({ authority: 'SRB' })])).toMatchObject({ kind: 'fallback' });
    const shop = [{ shopId: 's1', posId: '1', ntn: '1', secret: null }];
    expect(routingConflict([profile({ terminals: shop }), profile({ authority: 'SRB', terminals: shop })])).toMatchObject({ kind: 'shop', shopId: 's1' });
    expect(routingConflict([profile({ terminals: shop }), profile({ authority: 'SRB', terminals: shop, enabled: false })])).toBeNull();
  });

  it('hides credentials in stored requests', () => {
    expect(maskSecrets({ pos_user: 'u', pos_pass: 'p', nested: [{ key: 'k', token: '' }] })).toEqual({ pos_user: 'u', pos_pass: '••••', nested: [{ key: '••••', token: '' }] });
  });
});
