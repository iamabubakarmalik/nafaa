import { buildManualAdvance, orderMoney, paidAdvance } from './order-money';
import { advancePaid } from './payment-links.service';

const meta = (payments: any[]) => ({ payments });

describe('order money', () => {
  it('counts paid links and manual advances the same way courier COD does', () => {
    const m = meta([
      { ref: 'a', provider: 'SAFEPAY', amount: 200, status: 'PAID' },
      { ref: 'b', provider: 'MANUAL', method: 'JAZZCASH', amount: 300, status: 'PAID' },
      { ref: 'c', provider: 'SAFEPAY', amount: 999, status: 'PENDING' },
    ]);
    expect(paidAdvance(m)).toBe(500);
    expect(advancePaid(m)).toBe(500);
  });

  it('older orders without payments behave as before', () => {
    expect(paidAdvance(undefined)).toBe(0);
    expect(orderMoney({ total: 1500, deliveryFee: 150, paymentStatus: 'PENDING', metadata: null })).toEqual({ advance: 0, codDue: 1500, deliveryMode: 'CUSTOMER', deliveryFee: 150, originalFee: 150 });
  });

  it('COD is total less advance, zero once paid', () => {
    const m = meta([{ provider: 'MANUAL', amount: 400, status: 'PAID' }]);
    expect(orderMoney({ total: 1500, paymentStatus: 'PENDING', metadata: m }).codDue).toBe(1100);
    expect(orderMoney({ total: 1500, paymentStatus: 'PAID', metadata: m }).codDue).toBe(0);
  });

  it('delivery mode: rider, free or charged to the customer', () => {
    expect(orderMoney({ total: 1000, deliveryFee: 0 }).deliveryMode).toBe('FREE');
    expect(orderMoney({ total: 1000, deliveryFee: 100 }, 'RIDER').deliveryMode).toBe('RIDER');
    expect(orderMoney({ total: 1000, deliveryFee: 100, metadata: { riderDelivery: 100 } }, 'SHOP').deliveryMode).toBe('RIDER');
    expect(orderMoney({ total: 1000, deliveryFee: 100 }, 'SHOP').deliveryMode).toBe('CUSTOMER');
  });

  it('validates a manual advance', () => {
    const ctx = { due: 1000, ref: 'adv_1', userId: 'u1', now: new Date('2026-10-29T10:00:00Z') };
    expect(buildManualAdvance({ amount: 0, method: 'CASH' }, ctx)).toEqual({ error: 'Advance kam az kam Rs 1' });
    expect('error' in buildManualAdvance({ amount: 1200, method: 'CASH' }, ctx)).toBe(true);
    expect('error' in buildManualAdvance({ amount: 100, method: 'CHEQUE' }, ctx)).toBe(true);
    const ok = buildManualAdvance({ amount: 250, method: 'jazzcash', reference: '  TID 123  ' }, ctx);
    expect(ok).toEqual({ entry: expect.objectContaining({ ref: 'adv_1', provider: 'MANUAL', method: 'JAZZCASH', amount: 250, kind: 'ADVANCE', status: 'PAID', reference: 'TID 123', by: 'u1' }) });
    const full = buildManualAdvance({ amount: 1000, method: 'BANK' }, ctx);
    expect('entry' in full && full.entry.kind).toBe('FULL');
  });

  it('a delivery choice made on the order wins over the channel setting', () => {
    const free = { total: 1000, deliveryFee: 0, metadata: { deliveryChoice: 'FREE', deliveryOriginal: { fee: 150, total: 1150 } } };
    expect(orderMoney(free, 'RIDER')).toMatchObject({ deliveryMode: 'FREE', deliveryFee: 0, originalFee: 150, codDue: 1000 });
    const customer = { total: 1150, deliveryFee: 150, metadata: { deliveryChoice: 'CUSTOMER' } };
    expect(orderMoney(customer, 'RIDER').deliveryMode).toBe('CUSTOMER');
    const rider = { total: 1150, deliveryFee: 150, metadata: { deliveryChoice: 'RIDER', riderDelivery: 150 } };
    expect(orderMoney(rider).deliveryMode).toBe('RIDER');
  });
});
