import { codesMatch, linkSane, MatchIndex, meaningfulWords, suspectLink, titlesRelated } from './product-matcher';
import { planVariants } from './channel-import';
import { sameItem } from './channel-catalog.service';

const SPRAYER = 'Knapsack Backpack Sprayer 16 Liter Agricultural Pump';
const DAP = 'DAP 18-46-0';

describe('link sanity', () => {
  it('meaningful words drop sizes, units, colours and filler (English, Roman Urdu, Urdu)', () => {
    expect(meaningfulWords('DAP 18-46-0 50kg Bag')).toEqual(['dap']);
    expect(meaningfulWords('Best Quality Sprayer 16L Brown ka set')).toEqual(['sprayer']);
    expect(meaningfulWords('یوریا کھاد کا تھیلا')).toEqual(['یوریا', 'کھاد', 'تھیلا']);
    expect(meaningfulWords('1000 / 500 / 250')).toEqual([]);
  });

  it('the Kissan Mall case: sprayer and DAP are different items', () => {
    expect(titlesRelated(SPRAYER, DAP)).toBe(false);
    expect(linkSane({ remoteTitle: SPRAYER, remoteCodes: ['T556925-Brown'], nafaaName: DAP, nafaaCodes: [null, 'DAP-1000'] })).toBe(false);
    expect(sameItem(
      { title: SPRAYER, variants: [{ sku: 'T556925-Brown' }, { sku: 'T556736-Brown' }, { sku: 'T556391-Brown' }] as any },
      { name: DAP, sku: null, barcode: null, variants: [{ sku: null, barcode: null }, { sku: null, barcode: null }, { sku: null, barcode: null }] },
    )).toBe(false);
  });

  it('same item with different wording or plural is related', () => {
    expect(titlesRelated('DAP Fertilizer 50kg', DAP)).toBe(true);
    expect(titlesRelated('Garden Sprayers', 'Knapsack Sprayer 16L')).toBe(true);
    expect(titlesRelated('Kurta', 'kurta')).toBe(true);
  });

  it('an exact SKU or barcode makes a link sane even when the names differ', () => {
    expect(codesMatch([' t556925-brown '], ['T556925-Brown'])).toBe(true);
    expect(linkSane({ remoteTitle: SPRAYER, remoteCodes: ['T556925-Brown'], nafaaName: DAP, nafaaCodes: ['T556925-Brown'] })).toBe(true);
  });

  it('option values alone ("1000", "500", "250") never plan a link across different products', () => {
    const remote = ['1000', '500', '250'].map((size) => ({ key: size, title: size, sku: `T-${size}`, options: [{ name: 'Size', value: size }] }));
    const nafaa = ['1000', '500', '250'].map((size) => ({ id: `v${size}`, name: size, sku: null, size }));
    expect(planVariants(remote, nafaa, { related: false }).size).toBe(0);
    // Same product: options still link.
    expect(planVariants(remote, nafaa).size).toBe(3);
    // Exact SKU still links even for unrelated names.
    expect(planVariants(remote, [{ id: 'x', name: 'any', sku: 'T-500' }], { related: false }).get('500')).toEqual({ variantId: 'x', by: 'sku' });
  });

  it('the matcher never suggests a product that shares only a size name', () => {
    const index = new MatchIndex([{ id: 'dap', name: DAP, hasVariants: true, variants: [{ id: 'v1000', name: '1000', size: '1000' }] }]);
    expect(index.match({ title: '1000', variantTitle: '1000', hasVariants: true, sku: 'T556925-Brown' })).toBeNull();
    expect(index.match({ title: SPRAYER, variantTitle: '1000', hasVariants: true, sku: 'T556925-Brown' })).toBeNull();
  });

  it('"Ghalat link?" flags the sprayer link by title and by price', () => {
    expect(suspectLink({ remoteTitle: `${SPRAYER} — Brown`, remoteCodes: ['T556925-Brown'], nafaaName: `${DAP} 1000`, nafaaCodes: [], nafaaPrice: 390, channelPrice: 650 })).toEqual(['title']);
    expect(suspectLink({ remoteTitle: 'DAP Khad', remoteCodes: [], nafaaName: DAP, nafaaCodes: [], nafaaPrice: 390, channelPrice: 1500 })).toEqual(['price']);
    expect(suspectLink({ remoteTitle: 'DAP Khad 50kg', remoteCodes: [], nafaaName: DAP, nafaaCodes: [], nafaaPrice: 390, channelPrice: 420 })).toEqual([]);
  });
});
