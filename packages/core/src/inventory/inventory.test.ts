import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateLanded, autoSku, belowCost, countLine, countSummary, daysLeft, duplicateCodes, ean13CheckDigit, effectOf, expiryBuckets,
  expiryState, fefo, fromBaseQty, groupBySupplier, inStoreEan13, isEan13, isEan8, isWeighedUnit, landedPayload, landedRs, landedTotal,
  landedUnitCost, lowFlags, marginLevel, marginPct, markupPct, movingAverageCost, openingStock, orderMessage, packPrice, packPricesFromBase,
  autoPackPrices, autoPackValue, isAutoValue, inferPackAuto, applyAutoPrices, pieceFromPack, packSummary,
  packSavingPct, perBaseUnit, pickBatches, priceForMargin, priceForMarkup, quickQuantities, reorderTarget, resolveStockChange, splitIntoPacks,
  STOCK_CHOICES, stockStatus, stockValue, suggestQty, toBaseQty, whatsappLink, CORRECTION_CHOICE,
} from './index';

test('packs convert to and from base units', () => {
  assert.equal(toBaseQty(2, 24), 48);
  assert.equal(toBaseQty(1.5, 12), 18);
  assert.equal(toBaseQty(3, 0), 3);
  assert.equal(fromBaseQty(48, 24), 2);
  assert.equal(perBaseUnit(1100, 12), 1100 / 12);
  assert.equal(packSavingPct(100, 1100, 12), 8.33);
  assert.equal(packSavingPct(100, 1300, 12), 0);
  assert.equal(packPrice(100, 12, 5), 1140);
  assert.deepEqual(packPricesFromBase({ price: 100, costPrice: 80, wholesalePrice: 90, creditPrice: null }, 12), { price: 1200, costPrice: 960, wholesalePrice: 1080, creditPrice: null });
  assert.equal(packPricesFromBase({ price: 10, costPrice: 8.37, wholesalePrice: null, creditPrice: null }, 12).costPrice, 100.44);
});

test('pack prices follow the piece until typed by hand', () => {
  const base = { price: 50, costPrice: 40, wholesalePrice: 45, creditPrice: null };
  assert.deepEqual(autoPackPrices(base, 24), { price: 1200, costPrice: 960, wholesalePrice: 1080, creditPrice: null });
  // The discount comes off sale tiers only; cost is never discounted.
  assert.deepEqual(autoPackPrices(base, 24, 5), { price: 1140, costPrice: 960, wholesalePrice: 1026, creditPrice: null });
  assert.equal(autoPackValue('costPrice', { ...base, costPrice: 8.37 }, 12), 100.44);
  assert.equal(autoPackValue('price', base, 0), 0);

  assert.equal(isAutoValue('price', 1200, 1200), true);
  assert.equal(isAutoValue('price', 1200.4, 1200), true);
  assert.equal(isAutoValue('price', 1150, 1200), false);
  assert.equal(isAutoValue('wholesalePrice', null, 1080), true);
  assert.equal(isAutoValue('wholesalePrice', 1000, null), false);
  // Carton cost 1000 over 24 pieces is 41.67 each, which multiplies back to 1000.08.
  assert.equal(isAutoValue('costPrice', 1000, 1000.08, 24), true);
  assert.equal(isAutoValue('costPrice', 1000, 1000.5, 24), false);

  const pack = { conversionRate: 24, price: 1140, costPrice: 960, wholesalePrice: 1100, creditPrice: null };
  assert.deepEqual(inferPackAuto(base, pack), { discountPct: 5, manual: { wholesalePrice: true } });
  assert.deepEqual(inferPackAuto(base, { ...pack, price: 1150, wholesalePrice: 1080 }), { discountPct: 0, manual: { price: true } });

  // A piece price change moves every automatic tier and leaves typed ones alone.
  const next = { ...base, price: 60, costPrice: 45 };
  assert.deepEqual(applyAutoPrices(next, { ...pack, wholesalePrice: 1100 }, { wholesalePrice: true }, 5),
    { conversionRate: 24, price: 1368, costPrice: 1080, wholesalePrice: 1100, creditPrice: null });
  assert.equal(applyAutoPrices({ ...base, costPrice: 41.67 }, { ...pack, costPrice: 1000 }).costPrice, 1000);
  assert.equal(applyAutoPrices({ ...base, costPrice: 42 }, { ...pack, costPrice: 1000 }).costPrice, 1008);
});

test('a pack value gives back one piece, and the pack summary line', () => {
  assert.equal(pieceFromPack(960, 24), 40);
  assert.equal(pieceFromPack(1000, 24), 41.67);
  assert.equal(pieceFromPack(1150, 24), 47.92);
  assert.equal(autoPackValue('price', { price: 47.92, costPrice: 0, wholesalePrice: null, creditPrice: null }, 24), 1150);
  assert.equal(pieceFromPack(100, 0), 0);
  assert.deepEqual(packSummary({ price: 50, costPrice: 40, wholesalePrice: null, creditPrice: null }, { conversionRate: 24, price: 1200, costPrice: 960, wholesalePrice: null, creditPrice: null }),
    { perPiece: 50, profit: 240, profitPct: 20, savingPerPiece: 0 });
  assert.deepEqual(packSummary({ price: 50, costPrice: 40, wholesalePrice: null, creditPrice: null }, { conversionRate: 24, price: 1140, costPrice: 0, wholesalePrice: null, creditPrice: null }),
    { perPiece: 47.5, profit: null, profitPct: null, savingPerPiece: 2.5 });
});

test('base quantity splits into the biggest packs first', () => {
  const packs = [{ unitName: 'dozen', conversionRate: 12 }, { unitName: 'carton', conversionRate: 24 }, { unitName: 'pcs', conversionRate: 1 }];
  assert.deepEqual(splitIntoPacks(50, 'pcs', packs), [{ unitName: 'carton', qty: 2 }, { unitName: 'pcs', qty: 2 }]);
  assert.deepEqual(splitIntoPacks(36, 'pcs', packs), [{ unitName: 'carton', qty: 1 }, { unitName: 'dozen', qty: 1 }]);
  assert.deepEqual(splitIntoPacks(0, 'pcs', packs), [{ unitName: 'pcs', qty: 0 }]);
});

test('weighed units and quick quantities', () => {
  assert.ok(isWeighedUnit('KG'));
  assert.ok(!isWeighedUnit('pcs'));
  assert.deepEqual(quickQuantities('kg'), [0.25, 0.5, 1, 2, 5, 10]);
  assert.deepEqual(quickQuantities('box'), [1, 5, 10, 25, 50, 100]);
});

test('duplicate codes and opening stock', () => {
  assert.deepEqual(duplicateCodes(['123', ' 123 ', '', null, '456']), ['123']);
  assert.equal(openingStock({ stock: 5, variants: [], batches: [] }), 5);
  assert.equal(openingStock({ stock: 5, variants: [{ stock: 2 }, { stock: 3 }], batches: [{ quantity: 9 }] }), 5);
  assert.equal(openingStock({ stock: 5, variants: [], batches: [{ quantity: 4 }, { quantity: 1 }] }), 5);
});

test('margin, markup and prices', () => {
  assert.equal(marginPct(125, 100), 20);
  assert.equal(markupPct(125, 100), 25);
  assert.equal(marginPct(0, 100), null);
  assert.equal(priceForMarkup(100, 20), 120);
  assert.equal(priceForMargin(80, 20), 100);
  assert.ok(belowCost(90, 100));
  assert.ok(!belowCost(null, 100));
  assert.equal(marginLevel(100, 120), 'loss');
  assert.equal(marginLevel(100, 95), 'thin');
  assert.equal(marginLevel(100, 85), 'fair');
  assert.equal(marginLevel(100, 70), 'good');
  assert.equal(marginLevel(100, 0), 'none');
});

test('stock value ignores negative stock', () => {
  assert.deepEqual(stockValue([{ stock: 10, costPrice: 50, price: 60 }, { stock: -3, costPrice: 10, price: 20 }, { stock: 2.5, costPrice: 4, price: 5 }]),
    { units: 12.5, costValue: 510, saleValue: 612.5, profit: 102.5 });
  assert.equal(movingAverageCost(10, 100, 10, 120), 110);
  assert.equal(movingAverageCost(0, 0, 0, 77), 77);
});

test('landed cost splits by value, qty and weight with the remainder on the biggest line', () => {
  const lines = [{ id: 'a', value: 1000, qty: 10, weightKg: 5 }, { id: 'b', value: 2000, qty: 10, weightKg: null }, { id: 'c', value: 0, qty: 30, weightKg: 0 }];
  const byValue = allocateLanded(lines, 100, 'VALUE');
  assert.equal(byValue.get('a'), 33.33);
  assert.equal(byValue.get('b'), 66.67);
  assert.equal(byValue.get('c'), 0);
  const byQty = allocateLanded(lines, 100, 'QTY');
  assert.equal([...byQty.values()].reduce((s, v) => s + v, 0), 100);
  assert.equal(byQty.get('c'), 60);
  const byWeight = allocateLanded(lines, 100, 'WEIGHT');
  assert.equal(byWeight.get('a'), 100);
  // No weight anywhere falls back to value.
  const fallback = allocateLanded([{ id: 'x', value: 10, qty: 1, weightKg: null }, { id: 'y', value: 30, qty: 1, weightKg: null }], 40, 'WEIGHT');
  assert.equal(fallback.get('y'), 30);
  assert.equal(landedRs({ currency: 'USD', amount: 10, rate: 280.5 }), 2805);
  assert.equal(landedTotal([{ currency: 'PKR', amount: 500, rate: 0 }, { currency: 'USD', amount: 1, rate: 280 }]), 780);
  assert.deepEqual(landedPayload([
    { key: '1', kind: 'FREIGHT', label: ' ', currency: 'PKR', amount: 500, rate: 0 },
    { key: '2', kind: 'CUSTOMS', label: 'Duty', currency: 'USD', amount: 2, rate: 280 },
    { key: '3', kind: 'OTHER', label: '', currency: 'PKR', amount: 0, rate: 0 },
  ]), [{ kind: 'FREIGHT', label: undefined, amount: 500 }, { kind: 'CUSTOMS', label: 'Duty', currency: 'USD', foreignAmount: 2, exchangeRate: 280 }]);
  assert.equal(landedUnitCost(100, 10, 50), 105);
});

test('low stock status, flags, target and order quantity', () => {
  assert.equal(stockStatus(0, 5), 'out');
  assert.equal(stockStatus(5, 5), 'low');
  assert.equal(stockStatus(6, 5), 'in');
  assert.equal(daysLeft(10, 2), 5);
  assert.equal(daysLeft(10, 0), null);
  assert.deepEqual(lowFlags({ stock: 20, alert: 5, rate: 4 }), ['soon']);
  assert.deepEqual(lowFlags({ stock: 20, alert: 5, rate: 1 }), []);
  assert.deepEqual(lowFlags({ stock: 0, alert: 5, rate: 1, expiring: true }), ['out', 'expiry']);
  assert.equal(reorderTarget({ rate: 2, alert: 5 }), 60);
  assert.equal(reorderTarget({ rate: 0, alert: 5 }), 10);
  assert.equal(reorderTarget({ rate: 7.2, alert: 5, made: true }), 8);
  assert.equal(suggestQty({ stock: 3, target: 60, onOrder: 10, flags: ['low'] }), 47);
  assert.equal(suggestQty({ stock: 3, target: 60, flags: ['expiry'] }), 0);
});

test('supplier orders group by branch and supplier, unknown supplier last', () => {
  const row = (name: string, supplier: { id: string; name: string } | null, shop = 's1') => ({ shopId: shop, shopName: 'Main', name, unit: 'pcs', stock: 1, alert: 5, suggestQty: 10, supplier });
  const groups = groupBySupplier([row('Atta', null), row('Daal', { id: 'b', name: 'Bilal' }), row('Ghee', { id: 'a', name: 'Ahmed' }), row('Rice', { id: 'a', name: 'Ahmed' })]);
  assert.deepEqual(groups.map((g) => g.supplier?.name ?? '-'), ['Ahmed', 'Bilal', '-']);
  assert.equal(groups[0].rows.length, 2);
  const text = orderMessage(groups[0], 'Nafaa Store');
  assert.match(text, /Assalam-o-Alaikum Ahmed/);
  assert.match(text, /1\. Ghee — 10 pcs/);
  assert.equal(whatsappLink('0300-1234567', 'hi'), 'https://wa.me/923001234567?text=hi');
  assert.equal(whatsappLink(null, 'a b'), 'https://wa.me/?text=a%20b');
});

test('barcodes and SKU', () => {
  assert.equal(ean13CheckDigit('400638133393'), '1');
  assert.ok(isEan13('4006381333931'));
  assert.ok(!isEan13('4006381333932'));
  assert.ok(isEan8('96385074'));
  const code = inStoreEan13({ now: 1_700_000_123_456, random: () => 0.1234 });
  assert.ok(isEan13(code));
  assert.ok(code.startsWith('20'));
  const again = inStoreEan13({ now: 1_700_000_123_456, random: () => 0.1234, taken: new Set([code]) });
  assert.notEqual(again, code);
  assert.equal(autoSku('Atta Fine 1kg', 'RTL', () => 0), 'ATTA-FINE-1000');
  assert.equal(autoSku('', 'RTL', () => 0.5), 'RTL-5500');
});

test('quick stock dialog: add, remove, count and correction', () => {
  const opening = resolveStockChange(10, 'add', '5', STOCK_CHOICES.add[0]);
  assert.deepEqual([opening.next, opening.delta, opening.code, opening.type, opening.effect, opening.problem], [15, 5, null, 'OPENING_BALANCE', 'NONE', null]);
  const damage = resolveStockChange(10, 'remove', 3, STOCK_CHOICES.remove[0]);
  assert.deepEqual([damage.next, damage.code, damage.type, damage.effect], [7, 'DAMAGE', 'DAMAGE', 'LOSS']);
  const countUp = resolveStockChange(10, 'set', '12', STOCK_CHOICES.set[0]);
  assert.deepEqual([countUp.delta, countUp.code, countUp.type, countUp.effect], [2, 'AUDIT_FOUND', 'ADJUSTMENT_IN', 'GAIN']);
  const countDown = resolveStockChange(10, 'set', '4', STOCK_CHOICES.set[0]);
  assert.deepEqual([countDown.delta, countDown.code, countDown.type], [-6, 'THEFT', 'LOSS']);
  const fix = resolveStockChange(10, 'remove', '2', CORRECTION_CHOICE);
  assert.deepEqual([fix.type, fix.effect], ['ADJUSTMENT_OUT', 'NONE']);
  assert.equal(resolveStockChange(10, 'set', '10', STOCK_CHOICES.set[0]).problem, 'no_change');
  assert.equal(resolveStockChange(10, 'add', '', STOCK_CHOICES.add[0]).problem, 'empty');
  assert.equal(resolveStockChange(10, 'set', '0', STOCK_CHOICES.set[0]).problem, null);
  assert.equal(effectOf({ type: 'ADJUSTMENT_IN' }), 'GAIN');
  assert.equal(effectOf({ type: 'OPENING_BALANCE' }), 'NONE');
  assert.equal(effectOf({ type: 'DAMAGE', profitEffect: 'NONE' }), 'NONE');
});

test('stock count lines and summary', () => {
  assert.deepEqual(countLine(10, 12), { delta: 2, type: 'ADJUSTMENT_IN', code: 'AUDIT_FOUND', effect: 'GAIN' });
  assert.deepEqual(countLine(10, 7), { delta: -3, type: 'LOSS', code: 'THEFT', effect: 'LOSS' });
  assert.deepEqual(countLine(10, 7, true), { delta: -3, type: 'ADJUSTMENT_OUT', code: 'CORRECTION', effect: 'NONE' });
  assert.equal(countLine(5, 5).type, null);
  assert.deepEqual(countSummary([{ system: 10, counted: 12, cost: 5 }, { system: 10, counted: 7, cost: 10 }, { system: 3, counted: null }, { system: 1, counted: 1 }]),
    { counted: 3, changed: 2, gained: 2, lost: 3, gainValue: 10, lossValue: 30, net: -20 });
});

test('expiry state, FEFO and buckets', () => {
  const today = '2026-11-03';
  assert.equal(expiryState('2026-11-02', today), 'expired');
  assert.equal(expiryState('2026-11-20', today), 'soon');
  assert.equal(expiryState('2027-01-20', today), 'ok');
  assert.equal(expiryState(null, today), 'none');
  const batches = [
    { id: 'late', expiryDate: '2027-05-01', quantity: 5 },
    { id: 'none', expiryDate: null, quantity: 5 },
    { id: 'early', expiryDate: '2026-11-10', quantity: 3 },
    { id: 'empty', expiryDate: '2026-11-04', quantity: 0 },
  ];
  assert.deepEqual(fefo(batches).map((b) => b.id), ['early', 'late', 'none']);
  const pick = pickBatches(batches, 7);
  assert.deepEqual(pick.picks.map((p) => [p.batch.id, p.qty]), [['early', 3], ['late', 4]]);
  assert.equal(pickBatches(batches, 20).short, 7);
  const b = expiryBuckets([...batches, { id: 'old', expiryDate: '2026-10-01', quantity: 2 }], today);
  assert.deepEqual([b.expired.length, b.week.length, b.month.length, b.later.length], [1, 1, 0, 1]);
});

test('product emoji from name, then category, and a stable tint', async () => {
  const { productEmoji, productTintIndex } = await import('./index');
  assert.equal(productEmoji('Lux Soap 100g'), '🧼');
  assert.equal(productEmoji('Something', 'Personal care'), '🧴');
  assert.equal(productEmoji('Unknown'), '📦');
  assert.equal(productTintIndex('Atta', 8), productTintIndex('Atta', 8));
  assert.ok(productTintIndex('Atta', 8) < 8);
});
