import {
  balancingFigures, cleanInviteCode, deliveredLines, isForward, matchProducts, newInviteCode, phoneKey, reorderQty, schemeLabel, tradeStatusOf,
} from './trade-rules';

describe('phones and invite codes', () => {
  it('reads every common Pakistani format to the same key', () => {
    expect(phoneKey('0300-1234567')).toBe('3001234567');
    expect(phoneKey('+92 300 1234567')).toBe('3001234567');
    expect(phoneKey('923001234567')).toBe('3001234567');
    expect(phoneKey('12345')).toBeNull();
  });
  it('makes and cleans invite codes, including a pasted link', () => {
    const code = newInviteCode(() => 0.5);
    expect(code).toMatch(/^NF-[A-Z2-9]{6}$/);
    expect(cleanInviteCode('nf-7k2p9q')).toBe('NF-7K2P9Q');
    expect(cleanInviteCode('7K2P9Q')).toBe('NF-7K2P9Q');
    expect(cleanInviteCode('https://app.nafaa.pk/network/join/NF-7K2P9Q')).toBe('NF-7K2P9Q');
    expect(cleanInviteCode('NF-12')).toBeNull();
  });
});

describe('order states seen by the buyer', () => {
  it('folds the seller-only INVOICING lock into APPROVED', () => {
    expect(tradeStatusOf('INVOICING')).toBe('APPROVED');
    expect(tradeStatusOf('LOADED')).toBe('LOADED');
    expect(tradeStatusOf('PARTIAL')).toBe('PARTIAL');
    expect(tradeStatusOf('SOMETHING_NEW')).toBe('BOOKED');
  });
  it('announces only forward moves', () => {
    expect(isForward('BOOKED', 'APPROVED')).toBe(true);
    expect(isForward('INVOICED', 'DELIVERED')).toBe(true);
    expect(isForward('APPROVED', 'APPROVED')).toBe(false);
    expect(isForward('DELIVERED', 'INVOICED')).toBe(false);
  });
});

describe('deliveredLines', () => {
  const items = [
    // 2 cartons of 12 at Rs 1,200 less Rs 100 scheme = 2,300 for 24 pcs; 2 pcs free.
    { productId: 'p1', variantId: null, baseQty: 24, total: 2300, freeBaseQty: 2, freeProductId: null, deliveredBaseQty: null, deliveredFreeQty: null },
    // 10 pcs, free goods of another product.
    { productId: 'p2', variantId: null, baseQty: 10, total: 500, freeBaseQty: 1, freeProductId: 'p9', deliveredBaseQty: null, deliveredFreeQty: null },
  ];

  it('takes everything at net price when delivered in full, free goods at zero', () => {
    const lines = deliveredLines(items, 'DELIVERED');
    expect(lines).toEqual([
      { sellerProductId: 'p1', sellerVariantId: null, baseQty: 24, unitCost: 95.8333, free: false },
      { sellerProductId: 'p1', sellerVariantId: null, baseQty: 2, unitCost: 0, free: true },
      { sellerProductId: 'p2', sellerVariantId: null, baseQty: 10, unitCost: 50, free: false },
      { sellerProductId: 'p9', sellerVariantId: null, baseQty: 1, unitCost: 0, free: true },
    ]);
  });

  it('uses what settlement recorded on a partial delivery', () => {
    const partial = [{ ...items[0], deliveredBaseQty: 12, deliveredFreeQty: 1 }, { ...items[1], deliveredBaseQty: 0, deliveredFreeQty: 0 }];
    const lines = deliveredLines(partial, 'PARTIAL');
    expect(lines.map((l) => [l.sellerProductId, l.baseQty, l.free])).toEqual([['p1', 12, false], ['p1', 1, true]]);
    expect(lines[0].unitCost).toBe(95.8333);
  });

  it('gives nothing when all came back', () => {
    expect(deliveredLines(items, 'RETURNED')).toEqual([]);
  });
});

describe('balancingFigures', () => {
  it('turns the rounding gap into a discount so the purchase equals the khata figure', () => {
    const f = balancingFigures([{ baseQty: 24, unitCost: 95.8333 }, { baseQty: 2, unitCost: 0 }], 2300);
    expect(f.subtotal).toBe(2300);
    expect(f).toEqual({ subtotal: 2300, discount: 0, otherCharges: 0 });
    expect(balancingFigures([{ baseQty: 3, unitCost: 33.3334 }], 100)).toEqual({ subtotal: 100, discount: 0, otherCharges: 0 });
    expect(balancingFigures([{ baseQty: 1, unitCost: 100 }], 117)).toEqual({ subtotal: 100, discount: 0, otherCharges: 17 });
    expect(balancingFigures([{ baseQty: 1, unitCost: 100 }], 90)).toEqual({ subtotal: 100, discount: 10, otherCharges: 0 });
  });
});

describe('matchProducts', () => {
  const buyer = [
    { id: 'b1', name: 'Tapal Danedar 95g', sku: 'TD95', barcode: '111' },
    { id: 'b2', name: 'Surf Excel 1kg', sku: null, barcode: null, barcodes: ['222'] },
    { id: 'b3', name: 'Rooh Afza', sku: 'RA', barcode: null },
    { id: 'b4', name: 'Rooh-Afza', sku: null, barcode: null },
  ];
  it('matches by barcode, pack barcode, SKU then name, skipping ambiguous names', () => {
    const m = matchProducts([
      { id: 's1', name: 'Tapal Danedar', barcode: '111' },
      { id: 's2', name: 'Surf', barcode: null, barcodes: ['222'] },
      { id: 's3', name: 'Something', sku: 'td95' },
      { id: 's4', name: 'ROOH AFZA' },
      { id: 's5', name: 'Unknown' },
    ], buyer);
    expect(m.get('s1')).toEqual({ buyerProductId: 'b1', by: 'BARCODE' });
    expect(m.get('s2')).toEqual({ buyerProductId: 'b2', by: 'BARCODE' });
    expect(m.get('s3')).toEqual({ buyerProductId: 'b1', by: 'SKU' });
    expect(m.get('s4')).toEqual({ buyerProductId: 'b3', by: 'NAME' });
    expect(m.has('s5')).toBe(false);
  });
});

describe('reorderQty and scheme labels', () => {
  it('suggests up to twice the low level, in packs when a pack fits', () => {
    expect(reorderQty(2, 10, null)).toEqual({ baseQty: 18, packs: null, packSize: null });
    expect(reorderQty(2, 10, 12)).toEqual({ baseQty: 18, packs: 2, packSize: 12 });
    expect(reorderQty(9, 5, 24)).toEqual({ baseQty: 1, packs: null, packSize: null });
  });
  it('labels schemes in plain words', () => {
    expect(schemeLabel({ type: 'FREE_QTY', buyQty: 10, buyUnitName: 'Carton', freeQty: 1 })).toBe('10 Carton + 1 free');
    expect(schemeLabel({ type: 'PERCENT_OFF', buyQty: 0, value: 5 })).toBe('5% off');
  });
});
