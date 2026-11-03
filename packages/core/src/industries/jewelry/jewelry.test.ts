import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exchangeBuy, orderEstimate, TOLA, billTotals, buyRateOf, derivedRate, fromPerGram, karigarOutstanding, lineTotal, metalOf, oldGoldValue, perGramFrom, piecePrice, profilePrice, rateMap,
} from './index';

const rates = rateMap([
  { metalType: 'GOLD', purity: 'KARAT_22', ratePerGram: 30000, buyRate: 29400, isActive: true },
  { metalType: 'SILVER', purity: 'SILVER_999', ratePerGram: 400, isActive: true },
]);

test('tola and gram conversion', () => {
  assert.equal(Math.round(perGramFrom(TOLA * 30000, 'tola')), 30000);
  assert.equal(fromPerGram(30000, 'tola'), Math.round(30000 * TOLA));
});

test('karat rates follow 24K purity unless typed', () => {
  assert.equal(Math.round(derivedRate('KARAT_22', 30000)), Math.round(30000 * 0.916 / 0.9999));
  assert.equal(derivedRate('KARAT_22', 30000, 27000), 27000);
  assert.equal(buyRateOf(30000, 2), 29400);
  assert.equal(buyRateOf(30000, 90), 24000);
});

test('piece price: metal, banwai, wastage, stones', () => {
  const p = piecePrice({ netWeight: 10, ratePerGram: 30000, makingChargePerGram: 500, makingChargeFixed: 1000, makingChargePct: 1, wastagePct: 2, polishCharges: 200, hallmarkCharges: 100, stoneValue: 5000 });
  assert.equal(p.metal, 300000);
  assert.equal(p.making, 5000 + 1000 + 3000);
  assert.equal(p.wastage, 6000);
  assert.equal(p.other, 300);
  assert.equal(p.total, 300000 + 9000 + 6000 + 300 + 5000);
});

test('catalog piece uses the rate of its karat and null without one', () => {
  const j = { metalType: 'GOLD', purity: 'KARAT_22', netWeight: 5, makingChargeFixed: 2000, gemstones: [{ totalValue: 1000 }] };
  assert.equal(profilePrice(j, rates)?.total, 150000 + 2000 + 1000);
  assert.equal(profilePrice({ ...j, purity: 'KARAT_18' }, rates), null);
});

test('old gold: buying rate less kaat', () => {
  assert.deepEqual(oldGoldValue(10, 'KARAT_22', rates, 5), { perGram: 29400, full: 294000, value: 279300 });
  assert.equal(oldGoldValue(10, 'KARAT_21', rates, 0).value, 0);
  assert.equal(oldGoldValue(10, 'KARAT_22', rates, 99).value, 147000);
  assert.equal(metalOf('SILVER_925'), 'SILVER');
});

test('bill: old gold pays up to what is left and never gives change', () => {
  const lines = [{ netWeight: 5, ratePerGram: 30000, qty: 1 }, { netWeight: 0, ratePerGram: 0, qty: 2, plain: true, making: 500 }];
  assert.equal(lineTotal(lines[1]), 1000);
  const b = billTotals(lines, 1000, [{ code: 'JEX-1', value: 100000, grams: 4, purity: 'KARAT_22' }, { code: 'JEX-2', value: 100000, grams: 4, purity: 'KARAT_22' }]);
  assert.equal(b.subtotal, 151000);
  assert.equal(b.discount, 1000);
  assert.equal(b.tradeIns[0].amount, 100000);
  assert.equal(b.tradeIns[1].amount, 50000);
  assert.equal(b.total, 0);
  assert.equal(b.oldGrams, 8);
});

test('karigar holds issued metal less returned and wasted', () => {
  assert.equal(karigarOutstanding({ metalIssuedGrams: 50, metalReturnedGrams: 40, wastageGrams: 2 }), 8);
  assert.equal(karigarOutstanding({ metalIssuedGrams: 5, metalReturnedGrams: 40, wastageGrams: 2 }), 0);
});

test('buying old gold: net weight, kaat and testing', () => {
  assert.deepEqual(exchangeBuy({ grossWeight: 12, stoneWeight: 2, rate: 29400, kaatPct: 5, testing: 500 }), { net: 10, gross: 294000, kaat: 14700, pay: 278800 });
  assert.equal(exchangeBuy({ grossWeight: 1, stoneWeight: 5, rate: 100, kaatPct: 0, testing: 0 }).pay, 0);
  assert.equal(orderEstimate(8, 30000, 4000), 244000);
});
