import * as crypto from 'crypto';
import { missingScopes } from './shopify.service';
import { verifySignature } from './website-config';
import { myshopifyFromHtml, normalizeShopifySiteUrl, parseShopAddress, shopAddressError } from './shopify-shop';

const shopOf = (raw: string) => {
  const r = parseShopAddress(raw);
  return r.ok ? r.shop : r.reason;
};

describe('parseShopAddress', () => {
  it.each([
    ['kissanmall-pk', 'kissanmall-pk.myshopify.com'],
    ['kissanmall-pk.myshopify.com', 'kissanmall-pk.myshopify.com'],
    ['https://kissanmall-pk.myshopify.com', 'kissanmall-pk.myshopify.com'],
    ['http://kissanmall-pk.myshopify.com/', 'kissanmall-pk.myshopify.com'],
    ['https://kissanmall-pk.myshopify.com/admin', 'kissanmall-pk.myshopify.com'],
    ['https://kissanmall-pk.myshopify.com/admin/products?x=1', 'kissanmall-pk.myshopify.com'],
    ['admin.shopify.com/store/kissanmall-pk', 'kissanmall-pk.myshopify.com'],
    ['admin.shopify.com/store/kissanmall-pk.myshopify.com', 'kissanmall-pk.myshopify.com'],
    ['https://admin.shopify.com/store/kissanmall-pk/orders/123', 'kissanmall-pk.myshopify.com'],
    ['https://admin.shopify.com/store/kissanmall-pk.myshopify.com', 'kissanmall-pk.myshopify.com'],
    ['  KissanMall-PK.MyShopify.com//  ', 'kissanmall-pk.myshopify.com'],
    ['KISSANMALL-PK', 'kissanmall-pk.myshopify.com'],
    ['www.kissanmall-pk.myshopify.com', 'kissanmall-pk.myshopify.com'],
    ['kissanmall-pk.myshopify.com:443', 'kissanmall-pk.myshopify.com'],
  ])('%s → %s', (raw, shop) => {
    expect(shopOf(raw)).toBe(shop);
  });

  it('flags custom domains with the bare domain', () => {
    expect(parseShopAddress('www.kissanmall.pk')).toEqual({ ok: false, reason: 'custom-domain', domain: 'kissanmall.pk' });
    expect(parseShopAddress('https://kissanmall.pk/collections/all')).toEqual({ ok: false, reason: 'custom-domain', domain: 'kissanmall.pk' });
  });

  it('rejects empty and junk input', () => {
    expect(shopOf('')).toBe('empty');
    expect(shopOf('   ')).toBe('empty');
    expect(shopOf('kissan mall')).toBe('invalid');
    expect(shopOf('foo.bar.myshopify.com')).toBe('invalid');
    expect(shopOf('192.168.1.1')).toBe('invalid');
  });

  it('gives a message that says where to look', () => {
    const r = parseShopAddress('www.kissanmall.pk');
    if (r.ok) throw new Error('expected failure');
    expect(shopAddressError(r)).toContain('Settings → Domains');
  });
});

describe('normalizeShopifySiteUrl', () => {
  it('repairs a saved admin URL', () => {
    expect(normalizeShopifySiteUrl('https://admin.shopify.com/store/kissanmall-pk.myshopify.com')).toBe('https://kissanmall-pk.myshopify.com');
  });
  it('keeps what it cannot map', () => {
    expect(normalizeShopifySiteUrl('https://kissanmall.pk')).toBe('https://kissanmall.pk');
    expect(normalizeShopifySiteUrl(null)).toBeNull();
  });
});

describe('myshopifyFromHtml', () => {
  it('reads Shopify.shop from a storefront', () => {
    expect(myshopifyFromHtml('<script>var Shopify = Shopify || {};\nShopify.shop = "kissanmall-pk.myshopify.com";</script>')).toBe('kissanmall-pk.myshopify.com');
  });
  it('returns null for other sites', () => {
    expect(myshopifyFromHtml('<html><body>Hello</body></html>')).toBeNull();
  });
});

describe('Shopify manual mode helpers', () => {
  it('treats write_x as covering read_x', () => {
    const all = ['write_orders', 'write_products', 'write_inventory', 'read_locations', 'write_merchant_managed_fulfillment_orders'];
    expect(missingScopes(all)).toEqual([]);
    expect(missingScopes(['read_products'])).toContain('write_inventory');
  });

  it('accepts a webhook signed by any of the channel keys', () => {
    const raw = Buffer.from('{"id":1}');
    const sig = crypto.createHmac('sha256', 'notifications-key').update(raw).digest('base64');
    const headers = { 'x-shopify-hmac-sha256': sig };
    expect(verifySignature({ rawBody: raw, headers, shopifySecret: ['app-secret', 'notifications-key'] })).toBe('valid');
    expect(verifySignature({ rawBody: raw, headers, shopifySecret: ['app-secret'] })).toBe('invalid');
    expect(verifySignature({ rawBody: raw, headers, shopifySecret: [] })).toBe('missing');
  });
});
