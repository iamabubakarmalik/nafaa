import { GoogleService } from './google.service';

const prisma = {
  integration: { findMany: async () => [{ id: 'ch1', displayName: 'Order form', type: 'CUSTOM_WEBSITE', shopId: 's1', config: { form: { enabled: true, key: 'f_abcdefgh12', onlyInStock: true } } }] },
  tenant: { findUnique: async () => ({ name: 'Ali Store' }) },
  product: {
    findMany: async () => [
      { id: 'p1', name: 'Tapal Chai', sku: 'TC1', barcode: '4006381333931', price: 500, description: '<b>Achi</b> chai', shortDescription: null, hasVariants: false, stock: 0,
        category: { name: 'Chai' }, brand: null, images: [{ url: '/uploads/a.jpg' }], variants: [] },
      { id: 'p2', name: 'Bina tasveer', sku: null, barcode: null, price: 100, description: null, shortDescription: null, hasVariants: false, stock: 0, category: null, brand: null, images: [], variants: [] },
      { id: 'p3', name: 'Shirt', sku: 'SH', barcode: null, price: 1500, description: null, shortDescription: null, hasVariants: true, stock: 0, category: null, brand: { name: 'Khaadi' },
        images: [{ url: 'https://cdn.x/s.jpg' }], variants: [
          { id: 'v1', name: 'Small', sku: 'SH-S', barcode: null, price: 1500, stock: 0, color: null, size: 'S', imageUrl: null },
          { id: 'v2', name: 'Large', sku: 'SH-L', barcode: null, price: 1600, stock: 0, color: null, size: 'L', imageUrl: null },
        ] },
    ],
  },
  shopStock: { findMany: async () => [
    { productId: 'p1', variantId: null, stock: 5 }, { productId: 'p2', variantId: null, stock: 5 },
    { productId: 'p3', variantId: 'v1', stock: 2 }, { productId: 'p3', variantId: 'v2', stock: 0 },
  ] },
  productChannelMapping: { findMany: async () => [] },
} as any;

describe('GoogleService.buildItems', () => {
  const env = { ...process.env };
  afterAll(() => { process.env.WEB_APP_URL = env.WEB_APP_URL; process.env.PUBLIC_API_URL = env.PUBLIC_API_URL; if (env.WEB_APP_URL === undefined) delete process.env.WEB_APP_URL; if (env.PUBLIC_API_URL === undefined) delete process.env.PUBLIC_API_URL; });
  it('order form link, tasveer ke baghair nahi, variants group, GTIN, stock', async () => {
    process.env.WEB_APP_URL = 'https://app.nafaa.pk';
    process.env.PUBLIC_API_URL = 'https://api.nafaa.pk/api';
    const svc = new GoogleService(prisma);
    const r = await svc.buildItems('t1', { feedToken: 'x', channelId: null, defaultBrand: '', includeOutOfStock: false, storeCodes: {}, placeId: '', reviewOnBill: false });
    expect(r.items.map((i) => i.id)).toEqual(['p1', 'p3_v1']);
    const [chai, shirt] = r.items;
    expect(chai).toMatchObject({
      link: 'https://app.nafaa.pk/order/f_abcdefgh12?product=p1', image: 'https://api.nafaa.pk/uploads/a.jpg',
      gtin: '4006381333931', brand: 'Ali Store', description: 'Achi chai', inStock: true,
    });
    expect(shirt).toMatchObject({ groupId: 'p3', title: 'Shirt - Small', brand: 'Khaadi', size: 'S', mpn: 'SH-S' });
    expect(r.warnings.map((w) => w.code).sort()).toEqual(['no_image', 'out_of_stock']);
  });
});
