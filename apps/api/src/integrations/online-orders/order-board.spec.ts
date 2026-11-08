import { boardOf, isBoardStatus, planMove, stageKey, withTimeline } from './order-board';

const day = new Date('2026-11-01');

describe('orders board', () => {
  it('places an order on the board', () => {
    expect(boardOf({ orderStatus: 'PENDING' })).toBe('NEW');
    expect(boardOf({ orderStatus: 'PENDING', stage: 'ON_HOLD' })).toBe('ON_HOLD');
    expect(boardOf({ orderStatus: 'PREPARING' })).toBe('CONFIRMED');
    expect(boardOf({ orderStatus: 'READY', stage: 'PACKED_NOT_SENT' })).toBe('PACKED_NOT_SENT');
    // Flags sit on top of the lifecycle column.
    expect(boardOf({ orderStatus: 'READY', stage: 'ISSUE' })).toBe('PACKED');
    expect(boardOf({ orderStatus: 'OUT_FOR_DELIVERY', stage: 'custom:rider' })).toBe('custom:rider');
    expect(boardOf({ orderStatus: 'REJECTED' })).toBe('CANCELLED');
    expect(boardOf({ orderStatus: 'RETURNED', stage: 'custom:x' })).toBe('RETURNED');
  });

  it('accepts only known targets', () => {
    expect(isBoardStatus('PACKED')).toBe(true);
    expect(isBoardStatus('custom:call_back')).toBe(true);
    expect(isBoardStatus('custom:Bad Key')).toBe(false);
    expect(isBoardStatus('PREPARING')).toBe(false);
  });

  it('runs accept first when a new order jumps forward', () => {
    expect(planMove({ orderStatus: 'PENDING' }, 'CONFIRMED')).toEqual({ steps: [{ op: 'accept' }], stage: null });
    expect(planMove({ orderStatus: 'PENDING', stage: 'ON_HOLD' }, 'DISPATCHED')).toEqual({
      steps: [{ op: 'accept' }, { op: 'forward', status: 'OUT_FOR_DELIVERY' }], stage: null,
    });
  });

  it('only sets the stage for holds on a new order and for flags', () => {
    expect(planMove({ orderStatus: 'PENDING' }, 'NO_STOCK')).toEqual({ steps: [], stage: 'NO_STOCK' });
    expect(planMove({ orderStatus: 'DELIVERED', nafaaSaleId: 's' }, 'CLAIM')).toEqual({ steps: [], stage: 'CLAIM' });
    expect(planMove({ orderStatus: 'READY', nafaaSaleId: 's' }, 'custom:rider')).toEqual({ steps: [], stage: 'custom:rider' });
  });

  it('packed-not-sent keeps READY and the stage', () => {
    expect(planMove({ orderStatus: 'CONFIRMED', nafaaSaleId: 's' }, 'PACKED_NOT_SENT')).toEqual({
      steps: [{ op: 'forward', status: 'READY' }], stage: 'PACKED_NOT_SENT',
    });
    expect(planMove({ orderStatus: 'READY', stage: 'PACKED_NOT_SENT', nafaaSaleId: 's' }, 'PACKED')).toEqual({ steps: [], stage: null });
  });

  it('back to new voids the bill, and asks for force once dispatched or booked', () => {
    expect(planMove({ orderStatus: 'READY', nafaaSaleId: 's' }, 'NEW')).toEqual({ steps: [{ op: 'revert' }], stage: null });
    expect(planMove({ orderStatus: 'OUT_FOR_DELIVERY', nafaaSaleId: 's', dispatchedAt: day }, 'ON_HOLD')).toEqual({ error: 'NEEDS_FORCE' });
    expect(planMove({ orderStatus: 'CONFIRMED', nafaaSaleId: 's', courierBooked: true }, 'NEW')).toEqual({ error: 'NEEDS_FORCE' });
    expect(planMove({ orderStatus: 'OUT_FOR_DELIVERY', nafaaSaleId: 's', dispatchedAt: day }, 'ON_HOLD', { force: true }))
      .toEqual({ steps: [{ op: 'revert' }], stage: 'ON_HOLD' });
    expect(planMove({ orderStatus: 'DELIVERED', nafaaSaleId: 's', dispatchedAt: day, codSettledAt: day }, 'NEW', { force: true }))
      .toEqual({ error: 'COD_SETTLED' });
  });

  it('delivered goes back unless the COD was settled', () => {
    expect(planMove({ orderStatus: 'DELIVERED', nafaaSaleId: 's', dispatchedAt: day }, 'DISPATCHED')).toEqual({
      steps: [{ op: 'back', status: 'OUT_FOR_DELIVERY' }], stage: null,
    });
    expect(planMove({ orderStatus: 'DELIVERED', nafaaSaleId: 's', codSettledAt: day }, 'PACKED')).toEqual({ error: 'COD_SETTLED' });
  });

  it('closed orders reopen and then move forward', () => {
    expect(planMove({ orderStatus: 'CANCELLED' }, 'NEW')).toEqual({ steps: [{ op: 'reopen' }], stage: null });
    expect(planMove({ orderStatus: 'RETURNED', nafaaSaleId: 's' }, 'PACKED')).toEqual({
      steps: [{ op: 'reopen' }, { op: 'accept' }, { op: 'forward', status: 'READY' }], stage: null,
    });
  });

  it('cancel and return use their own paths; a lock blocks moves', () => {
    expect(planMove({ orderStatus: 'CONFIRMED', nafaaSaleId: 's', stage: 'ISSUE' }, 'CANCELLED')).toEqual({ steps: [{ op: 'cancel' }], stage: 'ISSUE' });
    expect(planMove({ orderStatus: 'OUT_FOR_DELIVERY', nafaaSaleId: 's' }, 'RETURNED')).toEqual({ steps: [{ op: 'return' }], stage: null });
    expect(planMove({ orderStatus: 'ACCEPTING' }, 'PACKED')).toEqual({ error: 'BUSY' });
  });

  it('keeps the last 100 timeline entries and makes stage keys', () => {
    let meta: any = {};
    for (let i = 0; i < 105; i++) meta = withTimeline(meta, { at: String(i), by: 'u', byName: null, from: 'NEW', to: 'PACKED' });
    expect(meta.timeline).toHaveLength(100);
    expect(meta.timeline[0].at).toBe('5');
    expect(stageKey('Rider pe hai!')).toBe('rider_pe_hai');
  });
});
