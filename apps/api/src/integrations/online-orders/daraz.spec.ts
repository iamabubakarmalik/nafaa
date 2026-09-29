import { darazSign, readTokenResponse, stockXml } from './daraz.client';

describe('Daraz signing', () => {
  it('official doc test vector', () => {
    const sig = darazSign('/order/get', { access_token: 'test', app_key: '123456', order_id: '1234', sign_method: 'sha256', timestamp: '1517820392000' }, 'helloworld');
    expect(sig).toBe('4190D32361CFB9581350222F345CB77F3B19F0E31D162316848A2C1FFD5FAB4A');
  });
  it('sign param khud sign me shamil nahi', () => {
    const a = darazSign('/x', { a: '1' }, 's');
    expect(darazSign('/x', { a: '1', sign: 'OLD' }, 's')).toBe(a);
  });
});

describe('Daraz helpers', () => {
  it('token: array aur object dono', () => {
    expect(readTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: 100, refresh_expires_in: 200, country_user_info: [{ country: 'pk', seller_id: '9', short_code: 'PK1' }] })).toMatchObject({ sellerId: '9', shortCode: 'PK1' });
    expect(readTokenResponse({ access_token: 'a', user_info: { seller_id: '7' } })).toMatchObject({ sellerId: '7' });
  });
  it('stock XML: escape + minus nahi', () => {
    const x = stockXml([{ itemId: '1', skuId: '2', sellerSku: 'A&B', quantity: -3 }]);
    expect(x).toContain('<SellerSku>A&amp;B</SellerSku><Quantity>0</Quantity>');
  });
});

import { darazOrderState, groupDarazItems, isoPk } from './daraz.service';
describe('Daraz order state', () => {
  it.each([
    [['unpaid'], 'skip'], [['pending'], 'open'], [['ready_to_ship', 'pending'], 'open'], [['canceled', 'canceled'], 'cancelled'],
    [['canceled', 'shipped'], 'shipped'], [['delivered', 'delivered'], 'delivered'], [['delivered', 'canceled'], 'delivered'],
    [['returned', 'delivered'], 'returned'], [['failed'], 'returned'], [[], 'skip'],
  ])('%j → %s', (st, want) => expect(darazOrderState(st as string[])).toBe(want));
});

describe('Daraz items', () => {
  it('har unit alag row → SKU se jor, cancel wali nikal', () => {
    const g = groupDarazItems([
      { order_item_id: 1, sku: 'HUB', sku_id: 9, name: 'Hub', paid_price: 799, status: 'pending' },
      { order_item_id: 2, sku: 'HUB', sku_id: 9, name: 'Hub', paid_price: 799, status: 'pending' },
      { order_item_id: 3, sku: 'CAP', sku_id: 5, name: 'Cap', item_price: 300, status: 'canceled' },
    ]);
    expect(g.length).toBe(1);
    expect(g[0]).toMatchObject({ sku: 'HUB', quantity: 2, price: 799, externalVariantId: '9' });
    expect(g[0].ids).toEqual(['1', '2']);
  });
  it('isoPk: Pakistan waqt', () => {
    expect(isoPk(new Date('2026-09-30T05:00:00Z'))).toBe('2026-09-30T10:00:00+05:00');
  });
});
