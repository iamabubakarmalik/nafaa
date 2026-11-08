import {
  compactStatusMap, darazStatusKey, inboundSteps, outboundAction, planInbound, plainStatusKeys, readStatusMap, shopifyStatusKeys, trackingInfo,
} from './channel-status-map';

const accepted = { orderStatus: 'CONFIRMED', paymentStatus: 'PENDING', nafaaSaleId: 's1', dispatchedAt: null };

describe('readStatusMap', () => {
  it('gives the defaults for an empty config', () => {
    const m = readStatusMap('WOOCOMMERCE', undefined);
    expect(m.inbound.cancelled).toBe('CANCELLED');
    expect(m.inbound.completed).toBe('NONE');
    expect(m.outbound.CONFIRMED).toBe('processing');
    expect(m.outbound.RETURNED).toBe('failed');
  });

  it('keeps valid choices and drops bad ones', () => {
    const m = readStatusMap('SHOPIFY', { inbound: { delivered: 'DELIVERED', fulfilled: 'BOGUS' }, outbound: { DISPATCHED: 'none', CANCELLED: 'explode' } });
    expect(m.inbound.delivered).toBe('DELIVERED');
    expect(m.inbound.fulfilled).toBe('NONE');
    expect(m.outbound.DISPATCHED).toBe('none');
    expect(m.outbound.CANCELLED).toBe('cancel');
  });

  it('takes custom statuses only where the channel has them', () => {
    expect(readStatusMap('WOOCOMMERCE', { inbound: { 'wc-shipped': 'DISPATCHED' } }).inbound.shipped).toBe('DISPATCHED');
    expect(readStatusMap('DARAZ', { inbound: { shipped_back: 'RETURNED' } }).inbound.shipped_back).toBeUndefined();
    expect(readStatusMap('WOOCOMMERCE', { outbound: { DISPATCHED: 'shipped' } }).outbound.DISPATCHED).toBe('shipped');
    expect(readStatusMap('SHOPIFY', { outbound: { DISPATCHED: 'shipped' } }).outbound.DISPATCHED).toBe('fulfill');
  });

  it('Daraz sends nothing by default', () => {
    const m = readStatusMap('DARAZ', null);
    expect(m.outbound).toEqual({ PACKED: 'none', DISPATCHED: 'none', CANCELLED: 'none' });
  });

  it('compact keeps only changes', () => {
    const m = readStatusMap('DARAZ', { outbound: { PACKED: 'rts' } });
    expect(compactStatusMap('DARAZ', m)).toEqual({ inbound: {}, outbound: { PACKED: 'rts' } });
  });
});

describe('outboundAction', () => {
  const shop = readStatusMap('SHOPIFY', null);
  it('maps lifecycle to board action', () => {
    expect(outboundAction('SHOPIFY', shop, 'PREPARING')).toBe('tag');
    expect(outboundAction('SHOPIFY', shop, 'OUT_FOR_DELIVERY')).toBe('fulfill');
    expect(outboundAction('SHOPIFY', shop, 'REJECTED')).toBe('cancel');
    expect(outboundAction('SHOPIFY', shop, 'PENDING')).toBe('none');
    expect(outboundAction('SHOPIFY', shop, 'DELIVERED', 'order.paid')).toBe('paid');
  });
  it('Daraz has nothing for delivered', () => {
    expect(outboundAction('DARAZ', readStatusMap('DARAZ', null), 'DELIVERED')).toBe('none');
  });
});

describe('status keys', () => {
  it('Shopify webhook', () => {
    expect(shopifyStatusKeys({ financial_status: 'paid', fulfillment_status: 'fulfilled', fulfillments: [{ shipment_status: 'delivered' }] }))
      .toEqual(['paid', 'fulfilled', 'delivered']);
    expect(shopifyStatusKeys({ financial_status: 'refunded', cancelled_at: '2026-11-01' })).toEqual(['refunded', 'cancelled']);
    expect(shopifyStatusKeys({ fulfillments: [{ shipment_status: 'failure' }] })).toEqual(['delivery_failed']);
  });
  it('plain status', () => {
    expect(plainStatusKeys('wc-Completed')).toEqual(['completed']);
    expect(plainStatusKeys('shipped', 'paid')).toEqual(['shipped', 'paid']);
    expect(plainStatusKeys('')).toEqual([]);
  });
  it('Daraz units', () => {
    expect(darazStatusKey(['unpaid'])).toBeNull();
    expect(darazStatusKey(['canceled', 'canceled'])).toBe('canceled');
    expect(darazStatusKey(['delivered', 'canceled'])).toBe('delivered');
    expect(darazStatusKey(['shipped', 'pending'])).toBe('shipped');
    expect(darazStatusKey(['ready_to_ship'])).toBe('ready_to_ship');
    expect(darazStatusKey(['packed', 'pending'])).toBe('ready_to_ship');
    expect(darazStatusKey(['delivered', 'failed'])).toBe('failed');
    expect(darazStatusKey(['returned', 'delivered'])).toBe('returned');
    expect(darazStatusKey(['pending'])).toBe('pending');
  });
});

describe('planInbound', () => {
  it('moves accepted orders forward only', () => {
    expect(planInbound(accepted, 'DISPATCHED')).toEqual([{ kind: 'status', status: 'OUT_FOR_DELIVERY' }]);
    expect(planInbound({ ...accepted, orderStatus: 'DELIVERED' }, 'DISPATCHED')).toEqual([]);
    expect(planInbound({ ...accepted, orderStatus: 'READY' }, 'PACKED')).toEqual([]);
  });
  it('never touches an order without a bill (except cancel and paid)', () => {
    const fresh = { ...accepted, orderStatus: 'PENDING', nafaaSaleId: null };
    expect(planInbound(fresh, 'DELIVERED')).toEqual([]);
    expect(planInbound(fresh, 'RETURNED')).toEqual([]);
    expect(planInbound(fresh, 'CANCELLED')).toEqual([{ kind: 'cancel' }]);
    expect(planInbound(fresh, 'PAID')).toEqual([{ kind: 'paid' }]);
  });
  it('return needs a dispatched order', () => {
    expect(planInbound(accepted, 'RETURNED')).toEqual([]);
    expect(planInbound({ ...accepted, orderStatus: 'OUT_FOR_DELIVERY', dispatchedAt: new Date() }, 'RETURNED')).toEqual([{ kind: 'returned' }]);
  });
  it('closed orders stay closed', () => {
    expect(planInbound({ ...accepted, orderStatus: 'CANCELLED' }, 'CANCELLED')).toEqual([]);
    expect(planInbound({ ...accepted, orderStatus: 'DELIVERED' }, 'CANCELLED')).toEqual([]);
    expect(planInbound({ ...accepted, orderStatus: 'RETURNED', paymentStatus: 'PENDING' }, 'PAID')).toEqual([]);
  });
});

describe('inboundSteps', () => {
  it('paid first, then the furthest move', () => {
    const m = readStatusMap('SHOPIFY', { inbound: { fulfilled: 'DISPATCHED', delivered: 'DELIVERED' } });
    expect(inboundSteps(m, ['paid', 'fulfilled', 'delivered'], accepted)).toEqual([{ kind: 'paid' }, { kind: 'status', status: 'DELIVERED' }]);
  });
  it('cancel wins over a forward move', () => {
    const m = readStatusMap('WOOCOMMERCE', { inbound: { completed: 'DELIVERED' } });
    expect(inboundSteps(m, ['cancelled', 'completed'], accepted)).toEqual([{ kind: 'cancel' }]);
  });
  it('unmapped statuses do nothing', () => {
    expect(inboundSteps(readStatusMap('WOOCOMMERCE', null), ['processing', 'completed'], accepted)).toEqual([]);
  });
  it('Daraz defaults match the old behaviour', () => {
    const m = readStatusMap('DARAZ', null);
    expect(inboundSteps(m, ['shipped'], accepted)).toEqual([{ kind: 'status', status: 'OUT_FOR_DELIVERY' }]);
    expect(inboundSteps(m, ['ready_to_ship'], accepted)).toEqual([]);
    expect(inboundSteps(m, ['canceled'], { ...accepted, orderStatus: 'PENDING', nafaaSaleId: null })).toEqual([{ kind: 'cancel' }]);
  });
});

describe('trackingInfo', () => {
  it('company, number and link', () => {
    expect(trackingInfo({ courierCode: 'LEOPARDS', trackingNumber: ' LE123 ' })).toEqual({ company: 'Leopards Courier', number: 'LE123' });
    expect(trackingInfo({ courierCode: 'PAKPOST', trackingNumber: 'VPL1' })).toEqual({ company: 'Pakistan Post', number: 'VPL1', url: 'https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz=VPL1' });
    expect(trackingInfo({ courierName: 'Bykea' })).toEqual({ company: 'Bykea' });
    expect(trackingInfo({})).toBeNull();
  });
});
