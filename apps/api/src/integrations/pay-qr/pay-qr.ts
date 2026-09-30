/** EMV QR ki jaanch (web ke core/payments/emvQr.ts jaisi) — ghalat QR save hi na ho */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (const b of Buffer.from(s, 'utf8')) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function checkPaymentQr(raw: string): { ok: true; merchantName: string; scheme: string } | { ok: false; error: string } {
  const s = String(raw ?? '').trim();
  if (s.length < 30 || s.length > 512) return { ok: false, error: 'QR ka data sahi lambai ka nahi' };
  const tlv: Array<{ id: string; value: string }> = [];
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(len) || i + 4 + len > s.length) return { ok: false, error: 'QR ka data toota hua hai' };
    tlv.push({ id, value: s.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  const get = (id: string) => tlv.find((t) => t.id === id)?.value;
  if (get('00') !== '01') return { ok: false, error: 'Ye payment QR nahi (EMV format nahi)' };
  const last = tlv[tlv.length - 1];
  if (last.id !== '63' || last.value.toUpperCase() !== crc16(s.slice(0, -4))) return { ok: false, error: 'QR ka checksum ghalat' };
  if (get('53') && get('53') !== '586') return { ok: false, error: 'QR Pakistani rupay ka nahi' };
  const mai = tlv.find((t) => Number(t.id) >= 26 && Number(t.id) <= 51);
  if (!mai) return { ok: false, error: 'QR me merchant khata nahi' };
  const scheme = mai.value.startsWith('00') ? mai.value.slice(4, 4 + Number(mai.value.slice(2, 4))) : '';
  return { ok: true, merchantName: get('59') ?? '', scheme };
}
