import {
  auditRow, barcodeText, buildLoadsheets, compareRates, dispatchCheck, labelOf, labelPages, normalizeDispatchSettings, parseArticles, reportTabs, reportTotals,
} from './dispatch';
import { emptyRate } from './order-costs';

const label = (over: Partial<Parameters<typeof labelOf>[0]> = {}) => labelOf({
  id: 'o1', number: '1001', trackingNumber: 'LE-123 456', courierCode: 'LEOPARDS', courierName: 'Leopards', courierLabelUrl: null,
  customerName: 'Ali', customerPhone: '03001234567', customerAddress: 'House 1', customerCity: 'Lahore',
  items: [{ name: 'Shirt', variant: 'M', quantity: 2 }, { name: 'Cap', quantity: 1 }], cod: 2499.6, weightKg: 0.5, ...over,
});

describe('labels', () => {
  it('barcode holds the CN in letters and digits', () => {
    expect(label().barcode).toBe('LE123456');
    expect(label({ trackingNumber: null }).barcode).toBe('1001');
    expect(barcodeText('ab-12 #3')).toBe('AB123');
  });

  it('counts pieces from item quantities and rounds COD', () => {
    const l = label();
    expect(l.pieces).toBe(3);
    expect(l.cod).toBe(2500);
    expect(l.prepaid).toBe(false);
    expect(l.lines).toEqual(['2 x Shirt (M)', '1 x Cap']);
  });

  it('booked pieces win over item count; zero COD is prepaid', () => {
    const l = label({ pieces: 1, cod: 0 });
    expect(l.pieces).toBe(1);
    expect(l.prepaid).toBe(true);
  });

  it('keeps at most 4 item lines and counts the rest', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ name: `Item ${i}`, quantity: 1 }));
    const l = label({ items });
    expect(l.lines).toHaveLength(4);
    expect(l.moreItems).toBe(2);
  });

  it('only keeps https courier label links', () => {
    expect(label({ courierLabelUrl: 'http://x.pk/a.pdf' }).courierLabelUrl).toBeNull();
    expect(label({ courierLabelUrl: 'https://x.pk/a.pdf' }).courierLabelUrl).toBe('https://x.pk/a.pdf');
  });

  it('puts 3 labels on an A4 page and 1 on a 4x6 sheet', () => {
    const seven = [1, 2, 3, 4, 5, 6, 7];
    expect(labelPages(seven, 'A4').map((p) => p.length)).toEqual([3, 3, 1]);
    expect(labelPages(seven, '4x6')).toHaveLength(7);
  });
});

describe('loadsheet', () => {
  const row = (cn: string, courier: string, cod: number, pieces = 1, weightKg: number | null = 0.5) => ({
    orderId: cn, number: cn, trackingNumber: cn, courierCode: courier, customerName: 'A', city: 'Lahore', cod, pieces, weightKg,
  });

  it('groups per courier with totals, skips duplicate CNs', () => {
    const sheets = buildLoadsheets([row('B2', 'TCS', 1000, 2), row('A1', 'TCS', 500), row('A1', 'TCS', 500), row('X9', 'POSTEX', 0, 1, null)]);
    expect(sheets.map((s) => s.courierCode)).toEqual(['TCS', 'POSTEX']);
    expect(sheets[0].rows.map((r) => r.trackingNumber)).toEqual(['A1', 'B2']);
    expect(sheets[0].totals).toEqual({ parcels: 2, pieces: 3, weightKg: 1, cod: 1500 });
    expect(sheets[1].totals).toEqual({ parcels: 1, pieces: 1, weightKg: 0, cod: 0 });
  });
});

describe('rate compare', () => {
  const rates = {
    TCS: { ...emptyRate(), base: 250, perKg: 100, codPct: 2, rtoPct: 100 },
    LEOPARDS: { ...emptyRate(), base: 200, perKg: 80, cities: [{ city: 'Karachi', base: 180 }], codPct: 1, rtoPct: 50 },
  };

  it('prices each courier from the rate card and the RTO rate from history', () => {
    const q = compareRates(['TCS', 'LEOPARDS', 'POSTEX'], rates, {
      TCS: { delivered: 90, returned: 10, cityDelivered: 9, cityReturned: 1 },
      LEOPARDS: { delivered: 70, returned: 30, cityDelivered: 2, cityReturned: 1 },
    }, { city: 'Lahore', weightKg: 1.2, cod: 3000 });
    const tcs = q.find((x) => x.code === 'TCS')!;
    // 250 + 1 extra started kilo above 0.5kg … (1.2 - 0.5 = 0.7 → 1)
    expect(tcs.charge).toBe(350);
    expect(tcs.codFee).toBe(60);
    expect(tcs.basis).toBe('CITY');
    expect(tcs.rtoRate).toBe(10);
    // 350 + 60 × 0.9 + 350 × 0.1
    expect(tcs.expected).toBe(439);
    const leo = q.find((x) => x.code === 'LEOPARDS')!;
    expect(leo.basis).toBe('ALL');
    expect(leo.rtoRate).toBe(30);
    expect(q.find((x) => x.code === 'POSTEX')!.charge).toBeNull();
  });

  it('prefers the cheapest courier whose RTO is near the best', () => {
    const q = compareRates(['TCS', 'LEOPARDS'], rates, {
      TCS: { delivered: 90, returned: 10, cityDelivered: 0, cityReturned: 0 },
      LEOPARDS: { delivered: 70, returned: 30, cityDelivered: 0, cityReturned: 0 },
    }, { city: 'Lahore', weightKg: 0.5, cod: 2000 });
    // Leopards is cheaper but its RTO (30%) is far above TCS (10%).
    expect(q.find((x) => x.best)!.code).toBe('TCS');
  });

  it('takes the cheaper courier when RTO rates are close, or unknown', () => {
    const q = compareRates(['TCS', 'LEOPARDS'], rates, {
      TCS: { delivered: 90, returned: 10, cityDelivered: 0, cityReturned: 0 },
      LEOPARDS: { delivered: 88, returned: 12, cityDelivered: 0, cityReturned: 0 },
    }, { city: 'Karachi', weightKg: 0.5, cod: 2000 });
    expect(q.find((x) => x.best)!.code).toBe('LEOPARDS');
    const none = compareRates(['TCS', 'LEOPARDS'], rates, {}, { city: 'Karachi', weightKg: 0.5, cod: 0 });
    expect(none.find((x) => x.best)!.code).toBe('LEOPARDS');
    expect(none.every((x) => x.basis === 'NONE')).toBe(true);
  });

  it('never preselects a courier without a rate card', () => {
    const q = compareRates(['POSTEX'], rates, {}, { city: 'Lahore', weightKg: 1, cod: 100 });
    expect(q[0].best).toBe(false);
  });
});

describe('dispatch scan check', () => {
  const o = (orderStatus: string, extra: Partial<{ nafaaSaleId: string | null; dispatchedAt: Date | null; deletedAt: Date | null }> = {}) =>
    ({ orderStatus, nafaaSaleId: 's1', dispatchedAt: null, deletedAt: null, ...extra });

  it('lets packed orders go', () => expect(dispatchCheck(o('READY'))).toBeNull());
  it('flags mistakes loudly', () => {
    expect(dispatchCheck(o('CONFIRMED'))).toBe('NOT_PACKED');
    expect(dispatchCheck(o('CONFIRMED'), true)).toBeNull();
    expect(dispatchCheck(o('PENDING', { nafaaSaleId: null }))).toBe('NOT_ACCEPTED');
    expect(dispatchCheck(o('OUT_FOR_DELIVERY'))).toBe('ALREADY_SENT');
    expect(dispatchCheck(o('READY', { dispatchedAt: new Date() }))).toBe('ALREADY_SENT');
    expect(dispatchCheck(o('CANCELLED'))).toBe('CANCELLED');
    expect(dispatchCheck(o('RETURNED'))).toBe('RETURNED');
    expect(dispatchCheck(o('DELIVERED'))).toBe('DELIVERED');
    expect(dispatchCheck(o('READY', { deletedAt: new Date() }))).toBe('DELETED');
  });
});

describe('dispatch report', () => {
  const now = Date.parse('2026-11-20T10:00:00Z');
  const base = { courierStatus: null, stage: null, dispatchedAt: new Date('2026-11-18T10:00:00Z'), replacementOfId: null, rtoReceived: false, claim: false, redispatched: false };

  it('sorts orders into audit tabs', () => {
    expect(reportTabs({ ...base, orderStatus: 'DELIVERED' }, now)).toEqual(['all', 'delivered']);
    expect(reportTabs({ ...base, orderStatus: 'RETURNED', rtoReceived: true }, now)).toEqual(['all', 'returns', 'rto_wh']);
    expect(reportTabs({ ...base, orderStatus: 'RETURNED' }, now)).toEqual(['all', 'returns', 'pending_rto']);
    expect(reportTabs({ ...base, orderStatus: 'OUT_FOR_DELIVERY', courierStatus: 'RETURNING' }, now)).toEqual(['all', 'open', 'pending_rto']);
    expect(reportTabs({ ...base, orderStatus: 'OUT_FOR_DELIVERY', courierStatus: 'ATTEMPTED', dispatchedAt: new Date('2026-11-10T10:00:00Z') }, now))
      .toEqual(['all', 'open', 'issue', 'stuck']);
    expect(reportTabs({ ...base, orderStatus: 'OUT_FOR_DELIVERY', courierStatus: 'OUT_FOR_DELIVERY', claim: true, redispatched: true, replacementOfId: 'x' }, now))
      .toEqual(['all', 'open', 'ofd', 'claims', 'redispatched', 'replacement']);
  });

  it('totals and success rate', () => {
    const t = reportTotals([
      { tabs: ['all', 'delivered'], cod: 1000 }, { tabs: ['all', 'delivered'], cod: 500 }, { tabs: ['all', 'delivered'], cod: 0 },
      { tabs: ['all', 'returns', 'rto_wh'], cod: 900 }, { tabs: ['all', 'open'], cod: 700 },
    ]);
    expect(t).toMatchObject({ dispatched: 5, delivered: 3, returned: 1, inProcess: 1, rtoInWarehouse: 1, deliveredCod: 1500, successRate: 75 });
  });
});

describe('COD audit', () => {
  it('finds short payments against the statement charges', () => {
    const r = auditRow({ cod: 3000, received: 2600, charge: 250, codFee: 60, rateCharge: 250, rateCodFee: 60 });
    expect(r).toEqual({ expectedNet: 2690, short: 90, overCharge: 0 });
  });

  it('finds deductions above the rate card', () => {
    const r = auditRow({ cod: 3000, received: 2600, charge: 340, codFee: 60, rateCharge: 250, rateCodFee: 60 });
    expect(r).toEqual({ expectedNet: 2600, short: 0, overCharge: 90 });
  });

  it('uses the rate card when the statement had no charges, and ignores rounding', () => {
    expect(auditRow({ cod: 2000, received: 1739, charge: null, codFee: null, rateCharge: 220, rateCodFee: 40 }))
      .toEqual({ expectedNet: 1740, short: 0, overCharge: 0 });
    expect(auditRow({ cod: 2000, received: null, charge: null, codFee: null, rateCharge: null, rateCodFee: 0 }))
      .toEqual({ expectedNet: 2000, short: 0, overCharge: 0 });
  });
});

describe('Pakistan Post articles', () => {
  it('reads "order article" lines in any order and bare articles', () => {
    expect(parseArticles('#1023 RGL12345678\nVPL98765432, 1024\n\nUMS55555555\nhello\n4567890123')).toEqual([
      { ref: '1023', article: 'RGL12345678' },
      { ref: '1024', article: 'VPL98765432' },
      { ref: null, article: 'UMS55555555' },
      { ref: null, article: '4567890123' },
    ]);
  });
});

describe('settings', () => {
  it('cleans posted settings', () => {
    expect(normalizeDispatchSettings({ afterBook: 'X', labelSize: 'A4', returnPhone: ' 0300 ' })).toEqual({
      afterBook: 'PACKED', labelSize: 'A4', returnName: '', returnPhone: '0300', returnAddress: '',
    });
  });
});
