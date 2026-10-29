import { MatchIndex, MatchProduct, findVariant, normalizeName, similarity, sizeKey, suggestAll } from './product-matcher';
import { mappingKey } from './mapping-key';

const catalog: MatchProduct[] = [
  {
    id: 'kurta', name: 'Lawn Kurta Embroidered', sku: 'KUR-1', hasVariants: true,
    variants: [
      { id: 'kurta-s', name: 'Small', size: 'S', sku: 'KUR-1-S' },
      { id: 'kurta-m', name: 'Medium', size: 'M', sku: null },
      { id: 'kurta-l', name: 'Large', size: 'L', sku: null },
    ],
  },
  { id: 'tea', name: 'Tapal Danedar 950g', sku: 'TEA-950', barcode: '8961000000011', hasVariants: false, variants: [] },
  { id: 'soap', name: 'Lux Soap Rose', sku: null, hasVariants: false, variants: [] },
  {
    id: 'shoe', name: 'Running Shoe', sku: null, hasVariants: true,
    variants: [{ id: 'shoe-black-42', name: 'Black / 42', color: 'Black', size: '42' }, { id: 'shoe-white-42', name: 'White / 42', color: 'White', size: '42' }],
  },
];
const index = new MatchIndex(catalog);

describe('product matcher', () => {
  it('normalises names and sizes', () => {
    expect(normalizeName('  Lawn-Kurta (Embroidered)! ')).toBe('lawn kurta embroidered');
    expect(sizeKey('Medium')).toBe('m');
    expect(sizeKey('Extra Large')).toBe('xl');
    expect(findVariant(catalog[0], 'medium')?.id).toBe('kurta-m');
    expect(findVariant(catalog[0], 'Default')).toBeNull();
  });

  it('1. SKU on the size is a sure match', () => {
    expect(index.match({ title: 'Anything', variantTitle: 'S', hasVariants: true, sku: 'kur-1-s' })).toEqual({ productId: 'kurta', variantId: 'kurta-s', kind: 'sku', score: 1 });
  });

  it('2. SKU on the product, then the size by name', () => {
    expect(index.match({ title: 'Kurta', variantTitle: 'Large', hasVariants: true, sku: 'KUR-1' })).toMatchObject({ productId: 'kurta', variantId: 'kurta-l', kind: 'sku' });
    expect(index.match({ title: 'Tea', hasVariants: false, barcode: '8961000000011' })).toMatchObject({ productId: 'tea', variantId: null, kind: 'sku' });
  });

  it('never links a product with sizes without a size', () => {
    // Product SKU matches but the channel item has no size: no product-level suggestion.
    expect(index.match({ title: 'Lawn Kurta Embroidered', hasVariants: false, sku: 'KUR-1' })).toBeNull();
    expect(index.match({ title: 'Lawn Kurta Embroidered', variantTitle: 'XXL', hasVariants: true })).toBeNull();
  });

  it('3. same name plus size', () => {
    expect(index.match({ title: 'lawn kurta  embroidered', variantTitle: 'M', hasVariants: true })).toMatchObject({ productId: 'kurta', variantId: 'kurta-m', kind: 'name' });
    expect(index.match({ title: 'Lux Soap Rose', hasVariants: false })).toMatchObject({ productId: 'soap', variantId: null, kind: 'name' });
    // size written into the title
    expect(index.match({ title: 'Running Shoe Black 42', hasVariants: false })).toMatchObject({ productId: 'shoe', variantId: 'shoe-black-42', kind: 'name' });
  });

  it('4. similar name gets a score', () => {
    const m = index.match({ title: 'Tapal Danedar Tea 950 g', hasVariants: false });
    expect(m).toMatchObject({ productId: 'tea', variantId: null, kind: 'fuzzy' });
    expect(m!.score).toBeGreaterThan(0.5);
    expect(m!.score).toBeLessThan(0.9);
    expect(index.match({ title: 'Completely different thing', hasVariants: false })).toBeNull();
    expect(similarity('Lux Soap Rose', 'Lux Soap Rose')).toBe(1);
  });

  it('skips what is already linked on the channel', () => {
    const taken = new Set([mappingKey('kurta', 'kurta-s')]);
    expect(index.match({ title: 'x', variantTitle: 'S', hasVariants: true, sku: 'KUR-1-S' }, taken)).toBeNull();
  });

  it('one Nafaa size is suggested once, to the strongest match', () => {
    const res = suggestAll([
      { title: 'Lux Soap Rose 100g', hasVariants: false },
      { title: 'Lux Soap Rose', hasVariants: false },
    ], index, new Set());
    expect(res[0].match).toBeNull();
    expect(res[1].match).toMatchObject({ productId: 'soap', kind: 'name' });
  });
});
