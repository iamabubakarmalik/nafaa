import * as crypto from 'crypto';
import { indoljJwt, indoljMenuToProducts } from './indolj.client';

describe('Indolj menu', () => {
  const menu = {
    status_code: 200, success: true,
    details: {
      '01': { cat_id: 1, category_name: 'Popular', items: { 7: { item_id: 7, item_name: 'Lotus Melt', prices: [{ price: 400, size: 'Regular', size_id: 1 }] } } },
      '12': {
        cat_id: 12, category_name: 'The Gourmet Batch', items: {
          7: { item_id: 7, item_name: 'Lotus Melt', photo: 'https://cdn.x/l.jpg', not_available: 1, pos_code: 'LOTUS', prices: [{ price: 400, size: 'Regular', size_id: 1, size_pos_code: '' }] },
          9: { item_id: 9, item_name: 'Pack of 2', not_available: 2, pos_code: '', prices: [{ price: 779, size: 'Box', size_id: 3, size_pos_code: 'P2' }, { price: 1500, size: 'Box of 4', size_id: 4, size_pos_code: 'P4' }] },
        },
      },
    },
  };
  it('categories → products, sizes → variants, popular ki nakal nahi', () => {
    const p = indoljMenuToProducts(menu);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ externalProductId: '7', title: 'Lotus Melt', status: 'active', hasVariants: false, image: 'https://cdn.x/l.jpg' });
    expect(p[0].variants[0]).toMatchObject({ externalVariantId: null, sku: 'LOTUS', price: 400 });
    expect(p[1]).toMatchObject({ status: 'unavailable', hasVariants: true });
    expect(p[1].variants.map((v) => [v.externalVariantId, v.title, v.sku, v.price])).toEqual([['3', 'Box', 'P2', 779], ['4', 'Box of 4', 'P4', 1500]]);
  });
  it('JWT HS512 merchant ki secret se', () => {
    const t = indoljJwt({ merchantId: '42', secret: 'sek' }, 1000).split('.');
    expect(JSON.parse(Buffer.from(t[0], 'base64url').toString())).toEqual({ alg: 'HS512', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(t[1], 'base64url').toString())).toEqual({ merchant_id: 42, iat: 1000, exp: 4600 });
    expect(t[2]).toBe(crypto.createHmac('sha512', 'sek').update(`${t[0]}.${t[1]}`).digest('base64url'));
  });
});
