/* ═════════════════════════════════════════════════════════════
   EMV QR (Raast / interoperable QR) — SBP ka QR standard EMVCo
   "merchant presented" hai: har khana ID(2) + LENGTH(2) + VALUE,
   aakhir me 63 = CRC16. Hum apna QR NAHI ghadte — dukaan ke bank /
   JazzCash / Easypaisa ka diya hua QR lete hain aur sirf raqam (54)
   aur bill number (62→01) daal kar CRC dobara banate hain. Merchant
   ka khata (26–51) bilkul waisa hi rehta hai.
   ═════════════════════════════════════════════════════════════ */

export interface Tlv { id: string; value: string }

export function crc16(s: string): string {
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(s);
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseTlv(s: string): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(len) || i + 4 + len > s.length) throw new Error('QR ka data toota hua hai');
    out.push({ id, value: s.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  return out;
}

const enc = (id: string, v: string) => {
  const len = [...v].length;
  if (len > 99) throw new Error(`QR khana ${id} bohat lamba`);
  return id + String(len).padStart(2, '0') + v;
};

export interface QrInfo {
  payload: string;
  merchantName: string;
  city: string;
  /** Raast / JazzCash / Easypaisa… merchant khate ka GUID (jaise "pk.raast") */
  scheme: string;
  dynamic: boolean;
  amount: number | null;
  valid: boolean;
  problems: string[];
}

/** QR padho aur check karo ke Pakistan ka rupay wala payment QR hai */
export function readPaymentQr(raw: string): QrInfo {
  const payload = raw.trim();
  const problems: string[] = [];
  let tlv: Tlv[] = [];
  try { tlv = parseTlv(payload); } catch (e) { problems.push((e as Error).message); }
  const get = (id: string) => tlv.find((t) => t.id === id)?.value ?? '';
  if (tlv.length) {
    if (get('00') !== '01') problems.push('Ye payment QR nahi lagta (EMV format nahi)');
    const crc = tlv[tlv.length - 1];
    if (crc?.id !== '63' || crc.value.toUpperCase() !== crc16(payload.slice(0, -4))) problems.push('QR ka checksum ghalat — tasveer saaf nahi ya QR adhoora');
    if (get('53') && get('53') !== '586') problems.push('Ye QR Pakistani rupay (586) ka nahi');
    if (get('58') && get('58') !== 'PK') problems.push('Ye QR Pakistan ka nahi');
  }
  const mai = tlv.find((t) => Number(t.id) >= 26 && Number(t.id) <= 51);
  let scheme = '';
  if (mai) { try { scheme = parseTlv(mai.value).find((t) => t.id === '00')?.value ?? ''; } catch { /* */ } }
  else if (tlv.length) problems.push('QR me merchant khata nahi mila');
  const amt = get('54');
  return {
    payload, merchantName: get('59'), city: get('60'), scheme,
    dynamic: get('01') === '12', amount: amt ? Number(amt) : null,
    valid: !problems.length, problems,
  };
}

/**
 * Bill ki raqam wala QR — customer scan kare to raqam khud bhari hui.
 * `bill` (62→01) customer ke app me "reference" ban kar dikhta hai.
 */
export function qrWithAmount(payload: string, amount: number, bill?: string): string {
  const tlv = parseTlv(payload.trim()).filter((t) => t.id !== '63');
  const set = (id: string, value: string | null) => {
    const i = tlv.findIndex((t) => t.id === id);
    if (value === null) { if (i >= 0) tlv.splice(i, 1); return; }
    if (i >= 0) tlv[i] = { id, value }; else tlv.push({ id, value });
  };
  set('01', '12');
  const a = Math.round(amount * 100) / 100;
  set('54', Number.isInteger(a) ? String(a) : a.toFixed(2));
  if (bill) {
    const ref = bill.replace(/[^\x20-\x7e]/g, '').slice(0, 25);
    let sub: Tlv[] = [];
    const cur = tlv.find((t) => t.id === '62');
    if (cur) { try { sub = parseTlv(cur.value).filter((t) => t.id !== '01'); } catch { sub = []; } }
    set('62', [{ id: '01', value: ref }, ...sub].map((t) => enc(t.id, t.value)).join(''));
  }
  // EMV qaida: khane ID ki tarteeb se
  tlv.sort((a, b) => Number(a.id) - Number(b.id));
  const body = tlv.map((t) => enc(t.id, t.value)).join('') + '6304';
  return body + crc16(body);
}
