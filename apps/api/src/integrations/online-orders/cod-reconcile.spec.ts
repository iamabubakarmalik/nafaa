import { ReconcileOrder, cnKey, detectColumns, matchStatement, parseMoney, readStatement } from './cod-reconcile';

describe('COD statement: columns', () => {
  it('Leopards style headers', () => {
    expect(detectColumns(['S.No', 'CN Number', 'Order ID', 'COD Amount', 'Delivery Charges', 'GST', 'Net Payable', 'Status']))
      .toEqual({ cn: 1, orderRef: 2, amount: 3, charge: 4, tax: 5, net: 6, status: 7 });
  });

  it('"COD charges" is a fee, not the amount', () => {
    expect(detectColumns(['Tracking No', 'COD', 'COD Charges', 'Shipping Charges'])).toEqual({ cn: 0, amount: 1, codFee: 2, charge: 3 });
  });

  it('PostEx / TCS style headers with spaces and case', () => {
    const m = detectColumns(['Tracking Number', 'Order Ref No', 'Invoice Amount', 'Transaction Fee Charges', 'Net Amount']);
    expect(m.cn).toBe(0);
    expect(m.orderRef).toBe(1);
    expect(m.amount).toBe(2);
    expect(m.charge).toBe(3);
    expect(m.net).toBe(4);
  });

  it('unknown headers stay unmapped', () => {
    expect(detectColumns(['Foo', 'Bar'])).toEqual({});
  });
});

describe('COD statement: values', () => {
  it('reads money cells', () => {
    expect(parseMoney('Rs 1,234.50')).toBe(1234.5);
    expect(parseMoney('(120)')).toBe(120);
    expect(parseMoney(-80)).toBe(80);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('n/a')).toBeNull();
  });

  it('CN keys ignore case, spaces and dashes', () => {
    expect(cnKey(' le-1234 5678 ')).toBe('LE12345678');
  });

  it('skips total and blank rows; adds tax to the charge', () => {
    const rows = readStatement([
      ['LE111', '1001', '2,000', '200', '32', '1768'],
      ['', '', '', '', '', ''],
      ['Total', '', '2000', '200', '32', '1768'],
    ], { cn: 0, orderRef: 1, amount: 2, charge: 3, tax: 4, net: 5 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ line: 2, cn: 'LE111', orderRef: '1001', amount: 2000, charge: 232, codFee: 0, net: 1768 });
  });

  it('works out the collection or the charge when a column is missing', () => {
    expect(readStatement([['CN1234', '1800', '200']], { cn: 0, net: 1, charge: 2 })[0].amount).toBe(2000);
    expect(readStatement([['CN1234', '2000', '1780']], { cn: 0, amount: 1, net: 2 })[0].charge).toBe(220);
  });
});

describe('COD statement: matching', () => {
  const o = (id: string, cn: string | null, expected: number, extra: Partial<ReconcileOrder> = {}): ReconcileOrder => ({
    id, number: `10${id.toUpperCase()}`, trackingNumber: cn, courierCode: 'LEOPARDS', orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED', expected, deliveredAt: null, ...extra,
  });
  const orders = [o('a', 'LE-001', 2000), o('b', 'LE-002', 1500), o('c', null, 900), o('d', 'LE-004', 3000), o('r', 'LE-009', 1200, { orderStatus: 'RETURNED', paymentStatus: 'NOT_COLLECTED' })];
  const waiting = orders.filter((x) => x.orderStatus === 'DELIVERED');
  const rows = readStatement([
    ['le001', '', '2000', '200'],
    ['LE002', '', '1400', '200'],
    ['', '#10c', '900', '150'],
    ['LE777', '', '500', '100'],
    ['LE009', '', '0', '350'],
    ['LE001', '', '2000', '200'],
  ], { cn: 0, orderRef: 1, amount: 2, charge: 3 });

  const r = matchStatement(rows, orders, waiting);

  it('matches by CN, else by order number', () => {
    expect(r.matched.map((m) => [m.order.id, m.by, m.ok])).toEqual([['a', 'CN', true], ['b', 'CN', false], ['c', 'ORDER', true], ['r', 'CN', true]]);
    expect(r.matched[1].diff).toBe(-100);
  });

  it('a returned parcel expects no money, only its charges', () => {
    expect(r.matched[3]).toMatchObject({ returned: true, diff: 0 });
  });

  it('rows not in Nafaa, and repeated rows, are unknown', () => {
    expect(r.unknown.map((x) => x.line)).toEqual([5, 7]);
  });

  it('delivered orders missing from the statement still have money with the courier', () => {
    expect(r.missing.map((x) => x.id)).toEqual(['d']);
  });
});
