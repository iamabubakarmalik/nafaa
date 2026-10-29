import { allocateSettlements, type AllocationInput, type BillInfo, type LedgerLine } from './sale-settlement.helper';
import { foldCreditProfit, foldWriteOffs, headlineGross, netProfit } from './business-math.helper';

const day = (d: number, h = 10) => new Date(Date.UTC(2026, 9, d, h));
let seq = 0;
const line = (type: string, amount: number, at: Date, reference: string | null = null): LedgerLine => ({
  id: `l${String(++seq).padStart(3, '0')}`, type, amount, reference, createdAt: at,
});
const bill = (saleNumber: string, net: number, soldAt: Date, live = true): BillInfo => ({
  id: `sale-${saleNumber}`, saleNumber, shopId: 'shop-1', soldAt, net, live,
});
const input = (lines: LedgerLine[], bills: BillInfo[], returns: Array<[string, string]> = []): AllocationInput => ({
  lines, bills: new Map(bills.map((b) => [b.saleNumber, b])), returns: new Map(returns),
});
const of = (rows: ReturnType<typeof allocateSettlements>, saleNumber: string) => rows.filter((r) => r.saleId === `sale-${saleNumber}`);
const sum = (rows: Array<{ amount: number }>) => Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;

describe('allocateSettlements (FIFO khata settlement)', () => {
  beforeEach(() => { seq = 0; });

  it('splits a part-credit bill into the counter part and the khata part', () => {
    // Bill 1,000: 400 paid at the counter, 600 on khata; 250 paid later.
    const rows = allocateSettlements(input(
      [line('SALE_CREDIT', 600, day(1), 'S1'), line('PAYMENT_RECEIVED', -250, day(5))],
      [bill('S1', 1000, day(1))],
    ));
    expect(rows.map((r) => [r.kind, r.amount])).toEqual([['UPFRONT', 400], ['PAYMENT', 250]]);
    expect(rows[1].settledAt).toEqual(day(5));
  });

  it('pays the opening balance first, then bills in date order', () => {
    const rows = allocateSettlements(input(
      [
        line('SALE_CREDIT', 300, day(1), 'S1'),
        line('SALE_CREDIT', 200, day(2), 'S2'),
        line('OPENING_BALANCE', 100, day(3)),
        line('PAYMENT_RECEIVED', -350, day(4)),
        line('PAYMENT_RECEIVED', -200, day(6)),
      ],
      [bill('S1', 300, day(1)), bill('S2', 200, day(2))],
    ));
    // 350: 100 opening, 250 to S1. 200: 50 to S1, 150 to S2.
    expect(sum(of(rows, 'S1').filter((r) => r.kind === 'PAYMENT'))).toBe(300);
    expect(of(rows, 'S1').filter((r) => r.kind === 'PAYMENT').map((r) => r.amount)).toEqual([250, 50]);
    expect(of(rows, 'S2').filter((r) => r.kind === 'PAYMENT').map((r) => r.amount)).toEqual([150]);
  });

  it('applies a payment that names a bill to that bill first', () => {
    const rows = allocateSettlements(input(
      [line('SALE_CREDIT', 300, day(1), 'S1'), line('SALE_CREDIT', 200, day(2), 'S2'), line('PAYMENT_RECEIVED', -200, day(3), 'S2')],
      [bill('S1', 300, day(1)), bill('S2', 200, day(2))],
    ));
    expect(of(rows, 'S1').filter((r) => r.kind === 'PAYMENT')).toHaveLength(0);
    expect(sum(of(rows, 'S2').filter((r) => r.kind === 'PAYMENT'))).toBe(200);
  });

  it('uses an advance paid before the bill on the bill day', () => {
    const rows = allocateSettlements(input(
      [line('PAYMENT_RECEIVED', -500, day(1)), line('SALE_CREDIT', 800, day(2), 'S1')],
      [bill('S1', 800, day(2))],
    ));
    const pay = of(rows, 'S1').filter((r) => r.kind === 'PAYMENT');
    expect(pay.map((r) => r.amount)).toEqual([500]);
    expect(pay[0].settledAt).toEqual(day(2));
  });

  it('a return to khata cuts the bill, not other bills', () => {
    // Bill net after the return is 700 (1,000 − 300 to khata).
    const rows = allocateSettlements(input(
      [line('SALE_CREDIT', 1000, day(1), 'S1'), line('REFUND', -300, day(2), 'RET-1'), line('PAYMENT_RECEIVED', -700, day(3))],
      [bill('S1', 700, day(1))],
      [['RET-1', 'S1']],
    ));
    expect(of(rows, 'S1').map((r) => [r.kind, r.amount])).toEqual([['UPFRONT', 0], ['PAYMENT', 700]]);
  });

  it('a voided bill gets no rows and a payment made on it moves to the next bill', () => {
    const rows = allocateSettlements(input(
      [
        line('SALE_CREDIT', 400, day(1), 'S1'),
        line('PAYMENT_RECEIVED', -400, day(2)),
        line('ADJUSTMENT', -400, day(3), 'S1'),
        line('SALE_CREDIT', 300, day(4), 'S2'),
      ],
      [bill('S1', 400, day(1), false), bill('S2', 300, day(4))],
    ));
    expect(of(rows, 'S1')).toHaveLength(0);
    expect(of(rows, 'S2').filter((r) => r.kind === 'PAYMENT').map((r) => r.amount)).toEqual([300]);
  });

  it('khata forgiven settles without money (WRITE_OFF)', () => {
    const rows = allocateSettlements(input(
      [line('SALE_CREDIT', 500, day(1), 'S1'), line('PAYMENT_RECEIVED', -200, day(2)), line('ADJUSTMENT', -300, day(3))],
      [bill('S1', 500, day(1))],
    ));
    expect(of(rows, 'S1').map((r) => [r.kind, r.amount])).toEqual([['UPFRONT', 0], ['PAYMENT', 200], ['WRITE_OFF', 300]]);
  });

  it('never settles more than the bill net (cash refund after khata payment)', () => {
    // Bill 1,000 with 600 on khata; 400 refunded in cash later, so net is 600; khata fully paid.
    const rows = allocateSettlements(input(
      [line('SALE_CREDIT', 600, day(1), 'S1'), line('PAYMENT_RECEIVED', -600, day(2))],
      [bill('S1', 600, day(1))],
    ));
    expect(sum(of(rows, 'S1'))).toBe(600);
  });

  it('is deterministic whatever order the lines arrive in', () => {
    const lines = [line('SALE_CREDIT', 300, day(1), 'S1'), line('PAYMENT_RECEIVED', -100, day(2)), line('SALE_CREDIT', 200, day(3), 'S2'), line('PAYMENT_RECEIVED', -300, day(4))];
    const bills = [bill('S1', 300, day(1)), bill('S2', 250, day(3))];
    expect(allocateSettlements(input([...lines].reverse(), bills))).toEqual(allocateSettlements(input(lines, bills)));
  });
});

describe('profit identities', () => {
  it('bill profit = realised on the period bills + pending + written off', () => {
    const c = foldCreditProfit([
      { part: 'bill', value: 1000 }, { part: 'plain', value: 600 }, { part: 'same', value: 150 },
      { part: 'sameOff', value: 50 }, { part: 'older', value: 80 },
    ]);
    expect(c.pending).toBe(200);
    expect(c.realised).toBe(830);
    expect(c.billProfit).toBe(c.realised - c.fromOlderBills + c.pending + c.writtenOff);
    expect(headlineGross(c, 'PAID')).toBe(830);
    expect(headlineGross(c, 'BILL')).toBe(1000);
  });

  it('net profit = gross − expenses − stock loss + stock gain + other income', () => {
    const w = foldWriteOffs([
      { kind: 'DAMAGE', value: 120, count: 1 }, { kind: 'ADJUSTMENT_OUT', value: 30, count: 1 },
      { kind: 'ADJUSTMENT_IN', value: 50, count: 1 }, { kind: 'CORRECTION', value: 999, count: 1 },
    ]);
    expect(w.lossTotal).toBe(150);
    expect(w.gain).toBe(50);
    expect(w.correction).toBe(999);
    expect(w.net).toBe(100);
    expect(w.count).toBe(3);
    expect(netProfit(2000, 300, w.net, 5000)).toBe(2000 - 300 - 150 + 50 + 5000);
  });
});
