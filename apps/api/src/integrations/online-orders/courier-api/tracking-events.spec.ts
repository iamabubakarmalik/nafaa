import { TRACKING_MAPPERS, eventStatus, eventsFromHistory, finalizeEvents, mergeEvents, parseCourierTime, riderOf } from './tracking-events';

describe('tracking events', () => {
  it('reads courier times as Pakistan time unless a zone is given', () => {
    expect(parseCourierTime('2026-11-09 14:20:00')).toBe('2026-11-09T09:20:00.000Z');
    expect(parseCourierTime('09/11/2026 02:20 PM')).toBe('2026-11-09T09:20:00.000Z');
    expect(parseCourierTime('2026-11-09', '14:20')).toBe('2026-11-09T09:20:00.000Z');
    expect(parseCourierTime('2026-11-09T09:20:00Z')).toBe('2026-11-09T09:20:00.000Z');
    expect(parseCourierTime(1762680000)).toBe(new Date(1762680000 * 1000).toISOString());
    expect(parseCourierTime('/Date(1762680000000)/')).toBe(new Date(1762680000000).toISOString());
    expect(parseCourierTime('soon')).toBeNull();
    expect(parseCourierTime(null)).toBeNull();
  });

  it('maps courier words to steps', () => {
    expect(eventStatus('Pickup Request Sent')).toBe('BOOKED');
    expect(eventStatus('Picked By PostEx')).toBe('PICKED_UP');
    expect(eventStatus('Arrived at Origin Facility')).toBe('AT_ORIGIN_HUB');
    expect(eventStatus('Dispatched to Karachi')).toBe('IN_TRANSIT');
    expect(eventStatus('Arrived at Destination')).toBe('AT_DESTINATION_HUB');
    expect(eventStatus('Out For Delivery')).toBe('OUT_FOR_DELIVERY');
    expect(eventStatus('Delivery Unsuccessful - Consignee not available')).toBe('ATTEMPT_FAILED');
    expect(eventStatus('Delivered')).toBe('DELIVERED');
    expect(eventStatus('Out For Return')).toBe('RETURNING');
    expect(eventStatus('Returned to shipper')).toBe('RETURNED');
    expect(eventStatus('Cancelled')).toBe('CANCELLED');
    expect(eventStatus('Arrived at Station')).toBe('HUB');
    expect(eventStatus('Something new')).toBe('OTHER');
  });

  it('finds the rider in fields or text', () => {
    expect(riderOf({}, 'Out for delivery - Rider: Ali Khan 0300-1234567')).toEqual({ name: 'Ali Khan', phone: '03001234567' });
    expect(riderOf({ rider_name: 'Bilal', rider_phone: '03211234567' }, 'Out for delivery')).toEqual({ name: 'Bilal', phone: '03211234567' });
    expect(riderOf({}, 'Delivered')).toBeUndefined();
  });

  it('sorts, removes repeats and places plain hub arrivals', () => {
    const list = finalizeEvents([
      { at: '2026-11-10T05:00:00.000Z', status: 'AT_ORIGIN_HUB', text: 'Arrived at Station', hub: true } as any,
      { at: '2026-11-09T05:00:00.000Z', status: 'BOOKED', text: 'Booked' },
      { at: '2026-11-09T08:00:00.000Z', status: 'AT_ORIGIN_HUB', text: 'Arrived at Station', hub: true } as any,
      { at: '2026-11-09T09:00:00.000Z', status: 'IN_TRANSIT', text: 'Dispatched' },
      { at: null, status: 'OTHER', text: 'Note after dispatch' },
      { at: '2026-11-09T05:00:00.000Z', status: 'BOOKED', text: 'booked' },
      { at: null, status: 'OTHER', text: '' },
    ]);
    expect(list.map((e) => e.status)).toEqual(['BOOKED', 'AT_ORIGIN_HUB', 'IN_TRANSIT', 'OTHER', 'AT_DESTINATION_HUB']);
  });

  it('merges saved and fresh events without repeats', () => {
    const saved = [{ at: '2026-11-09T05:00:00.000Z', status: 'BOOKED', text: 'Booked' }];
    const merged = mergeEvents(saved, eventsFromHistory([{ label: 'Booked', at: '2026-11-09 10:00:00' }, { label: 'Delivered', at: '2026-11-11 12:00:00' }]));
    expect(merged.map((e) => e.status)).toEqual(['BOOKED', 'DELIVERED']);
  });

  describe('per courier', () => {
    it('PostEx', () => {
      const e = TRACKING_MAPPERS.POSTEX({ transactionStatusHistory: [
        { transactionStatusMessage: 'Order Created', modifiedDatetime: '2026-11-09 10:00:00' },
        { transactionStatusMessage: 'Picked By PostEx', modifiedDatetime: '2026-11-09 16:00:00' },
        { transactionStatusMessage: 'PostEx WareHouse', modifiedDatetime: '2026-11-09 18:00:00' },
        { transactionStatusMessage: 'Out For Delivery', modifiedDatetime: '2026-11-10 10:00:00', riderName: 'Ali', riderPhone: '03001112222' },
        { transactionStatusMessage: 'Delivered', modifiedDatetime: '2026-11-10 13:00:00' },
      ] });
      expect(e.map((x) => x.status)).toEqual(['BOOKED', 'PICKED_UP', 'AT_ORIGIN_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED']);
      expect(e[3].rider).toEqual({ name: 'Ali', phone: '03001112222' });
      expect(e[0].at).toBe('2026-11-09T05:00:00.000Z');
    });

    it('Leopards', () => {
      const e = TRACKING_MAPPERS.LEOPARDS({ 'Tracking Detail': [
        { Status: 'Pickup Request Sent', Activity_datetime: '2026-11-09 10:00:00' },
        { Status: 'Arrived at Station', Activity_datetime: '2026-11-09 18:00:00', Station: 'Lahore' },
        { Status: 'Dispatched', Activity_datetime: '2026-11-09 20:00:00' },
        { Status: 'Arrived at Station', Activity_datetime: '2026-11-10 08:00:00', Station: 'Karachi' },
        { Status: 'Pending', Reason: 'Consignee not available', Activity_Date: '2026-11-10', Activity_Time: '15:00' },
      ] });
      expect(e.map((x) => [x.status, x.city ?? null])).toEqual([
        ['BOOKED', null], ['AT_ORIGIN_HUB', 'Lahore'], ['IN_TRANSIT', null], ['AT_DESTINATION_HUB', 'Karachi'], ['ATTEMPT_FAILED', null],
      ]);
      expect(e[4].at).toBe('2026-11-10T10:00:00.000Z');
    });

    it('TCS (newest first)', () => {
      const e = TRACKING_MAPPERS.TCS({
        checkpoints: [
          { status: 'Out For Delivery', datetime: '2026-11-10T09:00:00', station: 'Karachi' },
          { status: 'Arrived at Destination', datetime: '2026-11-10T06:00:00' },
          { status: 'Booked', datetime: '2026-11-09T10:00:00' },
        ],
        deliveryinfo: [],
      });
      expect(e.map((x) => x.status)).toEqual(['BOOKED', 'AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY']);
    });

    it('Trax (newest first, epoch time)', () => {
      const e = TRACKING_MAPPERS.TRAX({ details: { tracking_history: [
        { status: 'Shipment - Delivery Unsuccessful', status_reason: 'Refused', timestamp: 1762770000 },
        { status: 'Shipment - Picked', timestamp: 1762680000 },
      ] } });
      expect(e.map((x) => x.status)).toEqual(['PICKED_UP', 'ATTEMPT_FAILED']);
      expect(e[1].text).toBe('Shipment - Delivery Unsuccessful (Refused)');
    });

    it('M&P and Call Courier', () => {
      const mnp = TRACKING_MAPPERS.MNP({ Details: [
        { Status: 'Booked', DateTime: '09/11/2026 10:00 AM', Location: 'Lahore' },
        { Status: 'Return', Detail: 'Out for return', DateTime: '12/11/2026 10:00 AM' },
      ] });
      expect(mnp.map((x) => x.status)).toEqual(['BOOKED', 'RETURNING']);
      const cc = TRACKING_MAPPERS.CALL_COURIER([
        { ProcessDescForPortal: 'Shipment Picked', TransactionDate: '/Date(1762680000000)/' },
        { OperationDesc: 'Delivered', TransactionDate: '/Date(1762770000000)/' },
        { OperationDesc: 'Delivered', TransactionDate: '/Date(1762770000000)/' },
      ]);
      expect(cc.map((x) => x.status)).toEqual(['PICKED_UP', 'DELIVERED']);
    });
  });
});
