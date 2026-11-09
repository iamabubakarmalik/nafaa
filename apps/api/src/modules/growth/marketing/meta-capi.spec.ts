import { createHash } from 'crypto';
import { capiRequest, isPermanentError, normCity, normEmail, normPhone, purchaseEvent, retryDelayMs, splitName, userData } from './meta-capi';

const h = (s: string) => createHash('sha256').update(s).digest('hex');

describe('Meta Conversions API payloads', () => {
  it('normalises Pakistani phones with the country code', () => {
    expect(normPhone('0300-1234567')).toBe('923001234567');
    expect(normPhone('+92 300 1234567')).toBe('923001234567');
    expect(normPhone('00923001234567')).toBe('923001234567');
    expect(normPhone('3001234567')).toBe('923001234567');
    expect(normPhone('12')).toBeNull();
  });

  it('normalises email, city and name as Meta asks', () => {
    expect(normEmail('  Ali@Example.COM ')).toBe('ali@example.com');
    expect(normEmail('not-an-email')).toBeNull();
    expect(normCity('Dera Ghazi Khan')).toBe('deraghazikhan');
    expect(normCity("Rahim Yar-Khan.")).toBe('rahimyarkhan');
    expect(splitName('Muhammad  Ali Khan')).toEqual({ fn: 'muhammad', ln: 'khan' });
    expect(splitName('Customer')).toEqual({ fn: null, ln: null });
  });

  it('hashes customer fields and leaves fbc plain', () => {
    const at = new Date(1_700_000_000_000);
    const u = userData({ phone: '03001234567', email: 'A@B.pk', city: 'Lahore', name: 'Sara Ahmed', externalId: '3001234567', fbclid: 'XYZ', clickAt: at });
    expect(u.ph).toEqual([h('923001234567')]);
    expect(u.em).toEqual([h('a@b.pk')]);
    expect(u.ct).toEqual([h('lahore')]);
    expect(u.fn).toEqual([h('sara')]);
    expect(u.ln).toEqual([h('ahmed')]);
    expect(u.country).toEqual([h('pk')]);
    expect(u.external_id).toEqual([h('3001234567')]);
    expect(u.fbc).toBe('fb.1.1700000000000.XYZ');
    expect(JSON.stringify(u)).not.toContain('03001234567');
  });

  it('builds a delivered Purchase with a stable event id', () => {
    const e = purchaseEvent({
      orderId: 'o1', orderNumber: '1001', eventName: 'Purchase', deliveredAt: new Date('2026-11-09T10:00:00Z'), value: 2499.999,
      items: [{ id: 'p1', quantity: 2, price: 1250 }], customer: { phone: '03001234567' }, actionSource: 'website', sourceUrl: '/relative',
    });
    expect(e.event_id).toBe('nafaa_purchase_o1');
    expect(e.event_time).toBe(Math.floor(Date.parse('2026-11-09T10:00:00Z') / 1000));
    expect(e.custom_data).toMatchObject({ currency: 'PKR', value: 2500, order_id: '1001', num_items: 2 });
    expect((e as any).event_source_url).toBeUndefined();
  });

  it('keeps the token out of the URL and adds the test code', () => {
    const r = capiRequest('123456789', 'TOKEN', [{}], 'TEST1');
    expect(r.url).not.toContain('TOKEN');
    expect(r.body).toMatchObject({ access_token: 'TOKEN', test_event_code: 'TEST1' });
  });

  it('retries temporary errors only', () => {
    expect(isPermanentError(400, { error: { code: 100 } })).toBe(true);
    expect(isPermanentError(400, { error: { code: 17 } })).toBe(false);
    expect(isPermanentError(500, {})).toBe(false);
    expect(retryDelayMs(1)).toBe(60_000);
    expect(retryDelayMs(9)).toBe(6 * 3_600_000);
  });
});
