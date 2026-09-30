import { checkPaymentQr, crc16 } from './pay-qr';

describe('checkPaymentQr', () => {
  const body = '00020101021126290008pk.raast0113+9233678658235204541153035865802PK5915Faizan Shurjeel6006Lahore6304';
  it('CRC16-CCITT standard vector', () => expect(crc16('123456789')).toBe('29B1'));
  it('sahi QR', () => expect(checkPaymentQr(body + crc16(body))).toEqual({ ok: true, merchantName: 'Faizan Shurjeel', scheme: 'pk.raast' }));
  it('ghalat checksum / format', () => {
    expect(checkPaymentQr(body + 'AAAA')).toMatchObject({ ok: false });
    expect(checkPaymentQr('https://example.com/pay/123456789012345678901234567890')).toMatchObject({ ok: false });
  });
});
