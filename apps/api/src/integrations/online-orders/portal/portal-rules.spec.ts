import { allowedRequests, approvedStatus, canMove, linkCanSee, phoneKey, pickLines, samePhone } from './portal-rules';

describe('customer portal rules', () => {
  describe('token scoping', () => {
    const order = { id: 'o1', tenantId: 't1', customerPhone: '+92 300 1234567', deletedAt: null };
    it('an order link sees only its own order', () => {
      const link = { tenantId: 't1', kind: 'ORDER', channelOrderId: 'o1', phone: null };
      expect(linkCanSee(link, order)).toBe(true);
      expect(linkCanSee(link, { ...order, id: 'o2' })).toBe(false);
    });
    it('a customer link sees only orders with its phone, in its own business', () => {
      const link = { tenantId: 't1', kind: 'CUSTOMER', channelOrderId: null, phone: phoneKey('03001234567') };
      expect(linkCanSee(link, order)).toBe(true);
      expect(linkCanSee(link, { ...order, customerPhone: '03001234568' })).toBe(false);
      expect(linkCanSee(link, { ...order, tenantId: 't2' })).toBe(false);
      expect(linkCanSee(link, { ...order, customerPhone: null })).toBe(false);
    });
    it('a customer link without a phone sees nothing', () => {
      expect(linkCanSee({ tenantId: 't1', kind: 'CUSTOMER', channelOrderId: null, phone: null }, order)).toBe(false);
    });
    it('revoked, expired and deleted block access', () => {
      const link = { tenantId: 't1', kind: 'ORDER', channelOrderId: 'o1', phone: null };
      expect(linkCanSee({ ...link, revokedAt: new Date() }, order)).toBe(false);
      expect(linkCanSee({ ...link, expiresAt: new Date(Date.now() - 1000) }, order)).toBe(false);
      expect(linkCanSee(link, { ...order, deletedAt: new Date() })).toBe(false);
    });
    it('phones match on the last 10 digits', () => {
      expect(samePhone('+923001234567', '0300-1234567')).toBe(true);
      expect(samePhone('123', '123')).toBe(false);
    });
  });

  describe('allowed requests', () => {
    const now = new Date('2026-11-09T10:00:00Z');
    it('before dispatch: cancel and address change', () => {
      expect(allowedRequests({ orderStatus: 'CONFIRMED', dispatchedAt: null, deliveredAt: null, hasProducts: true }, [], now))
        .toEqual(['CANCEL', 'ADDRESS', 'REORDER']);
    });
    it('a new (pending) order has no reorder yet', () => {
      expect(allowedRequests({ orderStatus: 'PENDING', dispatchedAt: null, deliveredAt: null, hasProducts: true }, [], now)).toEqual(['CANCEL', 'ADDRESS']);
    });
    it('after dispatch: nothing until delivered', () => {
      expect(allowedRequests({ orderStatus: 'OUT_FOR_DELIVERY', dispatchedAt: now, deliveredAt: null, hasProducts: false }, [], now)).toEqual([]);
    });
    it('delivered within the window: return and exchange', () => {
      const deliveredAt = new Date('2026-11-01T10:00:00Z');
      expect(allowedRequests({ orderStatus: 'DELIVERED', dispatchedAt: deliveredAt, deliveredAt, hasProducts: true }, ['RETURN'], now))
        .toEqual(['EXCHANGE', 'REORDER']);
    });
    it('delivered long ago: only reorder', () => {
      const deliveredAt = new Date('2026-09-01T10:00:00Z');
      expect(allowedRequests({ orderStatus: 'DELIVERED', dispatchedAt: deliveredAt, deliveredAt, hasProducts: true }, [], now)).toEqual(['REORDER']);
    });
    it('cancelled orders allow only reorder', () => {
      expect(allowedRequests({ orderStatus: 'CANCELLED', dispatchedAt: null, deliveredAt: null, hasProducts: true }, [], now)).toEqual(['REORDER']);
    });
  });

  describe('state machine', () => {
    it('moves', () => {
      expect(canMove('REQUESTED', 'APPROVED')).toBe(true);
      expect(canMove('REQUESTED', 'WITHDRAWN')).toBe(true);
      expect(canMove('APPROVED', 'DONE')).toBe(true);
      expect(canMove('APPROVED', 'WITHDRAWN')).toBe(false);
      expect(canMove('REJECTED', 'APPROVED')).toBe(false);
      expect(canMove('DONE', 'REJECTED')).toBe(false);
      expect(canMove('NOPE', 'DONE')).toBe(false);
    });
    it('returns and exchanges wait for the parcel; the rest finish on approval', () => {
      expect(approvedStatus('RETURN')).toBe('APPROVED');
      expect(approvedStatus('EXCHANGE')).toBe('APPROVED');
      expect(approvedStatus('CANCEL')).toBe('DONE');
      expect(approvedStatus('ADDRESS')).toBe('DONE');
      expect(approvedStatus('REORDER')).toBe('DONE');
    });
  });

  it('pickLines keeps valid, unique lines with qty capped to the order', () => {
    const lines = [{ quantity: 2 }, { quantity: 1 }];
    expect(pickLines([{ index: 0, qty: 5 }, { index: 0, qty: 1 }, { index: 1 }, { index: 7, qty: 1 }, { index: -1 }], lines))
      .toEqual([{ index: 0, qty: 2 }, { index: 1, qty: 1 }]);
    expect(pickLines('x', lines)).toEqual([]);
  });
});
