import { convertWeight, darazOptionDefs, darazOptions, darazPrices, darazStock, htmlToText, planVariants, sizeColor, variantName, weightUnit } from './channel-import';
import { darazDetail, darazRemoteProduct } from './daraz.service';
import { darazOptionTitle } from './daraz.client';

/** A Daraz /products/get listing with two SKUs (shape from the Daraz Open Platform docs). */
const darazListing = {
  item_id: 2401558,
  status: 'Active',
  images: ['https://img.drz.lazcdn.com/p/a.jpg'],
  primary_category: 10001234,
  attributes: { name: 'Cotton Kurta', description: '<p>Soft <b>cotton</b></p><ul><li>Machine wash</li></ul>', brand: 'No Brand' },
  variation: {
    Variation1: { name: 'color_family', label: 'Color Family', options: ['Black', 'White'] },
    Variation2: { name: 'size', label: 'Size', options: ['M', 'L'] },
  },
  skus: [
    {
      SkuId: 9001, SellerSku: 'KUR-BLK-M', ShopSku: '2401558_PK-9001', quantity: 14, Available: 12, price: 2500, special_price: 1999,
      special_from_date: '2026-11-01 00:00', special_to_date: '2026-12-31 23:59', package_weight: '0.4',
      saleProp: { color_family: 'Black', size: 'M' }, Images: ['https://img.drz.lazcdn.com/p/b.jpg'],
    },
    {
      SkuId: 9002, SellerSku: 'KUR-WHT-L', ShopSku: '2401558_PK-9002', quantity: 0, price: 2500, special_price: 0,
      color_family: 'White', size: 'L', package_weight: '0.45', Images: [],
    },
  ],
};
const NOW = Date.parse('2026-11-09T10:00:00Z');

describe('Daraz listing → channel product', () => {
  const p = darazRemoteProduct(darazListing, undefined, NOW);
  it('keeps every SellerSku as its own variant with options from saleProp or the old fields', () => {
    expect(p.hasVariants).toBe(true);
    expect(p.variants.map((v) => v.sku)).toEqual(['KUR-BLK-M', 'KUR-WHT-L']);
    expect(p.variants[0].options).toEqual([{ name: 'Color Family', value: 'Black' }, { name: 'Size', value: 'M' }]);
    expect(p.variants[1].options).toEqual([{ name: 'Color Family', value: 'White' }, { name: 'Size', value: 'L' }]);
    expect(p.variants[0].title).toBe('Black / M');
    expect(p.optionNames).toEqual(['Color Family', 'Size']);
  });
  it('stock per SellerSku and the special price while it runs', () => {
    expect(p.variants[0].stock).toBe(14);
    expect(p.variants[1].stock).toBe(0);
    expect(p.variants[0]).toMatchObject({ price: 2500, sellPrice: 1999, compareAt: 2500, tracked: true });
    expect(p.variants[1]).toMatchObject({ price: 2500, sellPrice: null, compareAt: null });
    expect(p.variants[0].externalVariantId).toBe('9001');
  });
  it('a single-SKU listing is a simple item', () => {
    const one = darazRemoteProduct({ ...darazListing, skus: [darazListing.skus[0]] }, undefined, NOW);
    expect(one.hasVariants).toBe(false);
    expect(one.variants[0].options).toEqual([]);
    expect(one.variants[0].title).toBe('Black / M');
  });
  it('details: clean description, all images, no "No Brand", weight in kg', () => {
    const d = darazDetail(darazListing);
    expect(d.description).toBe('Soft cotton\n\n• Machine wash');
    expect(d.images).toEqual(['https://img.drz.lazcdn.com/p/a.jpg', 'https://img.drz.lazcdn.com/p/b.jpg']);
    expect(d.brand).toBeNull();
    expect(d.weight).toBe(0.4);
    expect(d.weightUnit).toBe('kg');
    expect(d.variants['9002'].weight).toBe(0.45);
  });
  it('option title reads saleProp (it was the SellerSku before)', () => {
    expect(darazOptionTitle(darazListing.skus[0], darazOptionDefs(darazListing))).toBe('Black / M');
    expect(darazOptionTitle({ SellerSku: 'X', saleProp: { size: 'Not Specified' } })).toBe('');
  });
});

describe('Daraz SKU helpers', () => {
  it('stock falls back to warehouse sellable units', () => {
    expect(darazStock({ multiWarehouseInventories: [{ sellableQuantity: 3 }, { sellableQuantity: 4 }] })).toBe(7);
    expect(darazStock({})).toBeNull();
  });
  it('an ended special price does not count', () => {
    expect(darazPrices({ price: 100, special_price: 80, special_to_date: '2026-10-01' }, NOW)).toEqual({ price: 100, sellPrice: null, compareAt: null });
    expect(darazPrices({ price: 100, special_price: 120 }, NOW).sellPrice).toBeNull();
  });
  it('options without a variation block use plain labels', () => {
    expect(darazOptions({ color_family: 'Red', size: 'XL' })).toEqual([{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'XL' }]);
  });
});

describe('channel text and units', () => {
  it('HTML to text keeps paragraphs and decodes entities', () => {
    expect(htmlToText('<p>A &amp; B</p><p>Line<br/>two</p><script>x()</script>')).toBe('A & B\nLine\ntwo');
    expect(htmlToText('')).toBeNull();
  });
  it('weight units and conversion', () => {
    expect(weightUnit('GRAMS')).toBe('g');
    expect(weightUnit('KILOGRAMS')).toBe('kg');
    expect(convertWeight(500, 'g', 'kg')).toBe(0.5);
    expect(convertWeight(1, 'kg', 'g')).toBe(1000);
  });
  it('size and colour from option names; variant name from options', () => {
    expect(sizeColor([{ name: 'Color Family', value: 'Black' }, { name: 'Size', value: 'M' }])).toEqual({ size: 'M', color: 'Black' });
    expect(variantName('Default', [])).toBe('Default');
    expect(variantName('Small', [{ name: 'Size', value: 'S' }])).toBe('S');
  });
});

describe('planVariants: channel SKU → Nafaa size', () => {
  const nafaa = [
    { id: 'v1', name: 'Black / M', sku: null, size: 'M', color: 'Black' },
    { id: 'v2', name: 'White / L', sku: 'KUR-WHT-L', size: 'L', color: 'White' },
    { id: 'v3', name: 'Large Blue', sku: null, size: null, color: null },
  ];
  it('matches by SKU first, then options, then name; each size once', () => {
    const p = darazRemoteProduct(darazListing, undefined, NOW);
    const remote = p.variants.map((v) => ({ key: v.externalVariantId!, title: v.title, sku: v.sku, options: v.options }));
    const plan = planVariants(remote, nafaa);
    expect(plan.get('9002')).toEqual({ variantId: 'v2', by: 'sku' });
    expect(plan.get('9001')).toEqual({ variantId: 'v1', by: 'options' });
  });
  it('matches by name when there are no options', () => {
    const plan = planVariants([{ key: 'a', title: 'Large Blue', sku: null }], nafaa);
    expect(plan.get('a')).toEqual({ variantId: 'v3', by: 'name' });
  });
  it('leaves an unknown SKU for a new size', () => {
    const plan = planVariants([{ key: 'z', title: 'Green / XL', sku: 'KUR-GRN-XL', options: [{ name: 'Color', value: 'Green' }, { name: 'Size', value: 'XL' }] }], nafaa);
    expect(plan.has('z')).toBe(false);
  });
  it('two channel SKUs never take the same Nafaa size', () => {
    const plan = planVariants([
      { key: 'a', title: 'M', sku: null, options: [{ name: 'Size', value: 'M' }] },
      { key: 'b', title: 'Medium', sku: null, options: [{ name: 'Size', value: 'Medium' }] },
    ], [{ id: 'x', name: 'M', sku: null, size: 'M', color: null }]);
    expect([...plan.values()].filter((v) => v.variantId === 'x')).toHaveLength(1);
  });
});
