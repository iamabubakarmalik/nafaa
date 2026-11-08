/**
 * Reads an order out of text pasted from WhatsApp / Instagram chats.
 *
 * Handles labelled lines ("Name: Ali", "Address - House 5", "City Lahore"),
 * Pakistani phone formats (03xx, +92 3xx, 92-3xx), a known city list, item
 * lines such as "2 x Shirt", "Shirt x2", "Shirt qty 2", "Shirt - 2 pcs", and
 * money such as "Rs 2500" or "COD: 2,500". Product matching is done by the
 * caller; this file has no database access so it is unit tested directly.
 */
import { PAKISTAN_CITIES } from '../../modules/onboarding/constants/location-data';

export interface ParsedItem { text: string; quantity: number; price?: number }

export interface ParsedOrder {
  customerName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  items: ParsedItem[];
  codAmount: number | null;
}

const CITY_ALIASES: Record<string, string> = {
  isb: 'Islamabad', pindi: 'Rawalpindi', rwp: 'Rawalpindi', khi: 'Karachi', lhr: 'Lahore', fsd: 'Faisalabad',
  pesh: 'Peshawar', 'd.i khan': 'Dera Ismail Khan', 'di khan': 'Dera Ismail Khan', 'd g khan': 'Dera Ghazi Khan', 'dg khan': 'Dera Ghazi Khan',
  ryk: 'Rahim Yar Khan', 'r.y khan': 'Rahim Yar Khan', hyd: 'Hyderabad', mux: 'Multan', gwa: 'Gujranwala', skt: 'Sialkot',
};

const CITIES: string[] = [...new Set([...PAKISTAN_CITIES.map((c) => c.name), 'Wah Cantt', 'Taxila', 'Murree', 'Attock', 'Chakwal', 'Jhang', 'Kasur', 'Okara', 'Sheikhupura', 'Gujrat', 'Jhelum', 'Mandi Bahauddin', 'Hafizabad', 'Khanewal', 'Vehari', 'Pakpattan', 'Muzaffargarh', 'Layyah', 'Bhakkar', 'Mianwali', 'Khushab', 'Nankana Sahib', 'Narowal', 'Toba Tek Singh', 'Chiniot', 'Lodhran', 'Bahawalnagar', 'Mirpur', 'Muzaffarabad', 'Gilgit', 'Skardu', 'Nawabshah', 'Larkana', 'Sukkur', 'Mirpur Khas', 'Jacobabad', 'Thatta', 'Badin', 'Mansehra', 'Abbottabad', 'Mardan', 'Swat', 'Mingora', 'Kohat', 'Bannu', 'Charsadda', 'Nowshera', 'Swabi', 'Haripur', 'Chitral', 'Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Sibi', 'Zhob'])]
  .sort((a, b) => b.length - a.length);

const LABELS: Record<string, RegExp> = {
  name: /^(customer\s*name|full\s*name|name|naam|nam)\b/i,
  phone: /^(phone|mobile|mob|cell|contact|number|no|whatsapp|wa|ph)\b/i,
  address: /^(complete\s*address|full\s*address|delivery\s*address|shipping\s*address|address|addr|pata|adress)\b/i,
  city: /^(city|shehar|sheher|shahar)\b/i,
  item: /^(product|products|item|items|order|article|cheez|saman)\b/i,
  qty: /^(qty|quantity|pcs|pieces|tadad)\b/i,
  amount: /^(cod|total|amount|price|bill|rs|pkr|rate|payment)\b/i,
  size: /^(size|color|colour|rang)\b/i,
};

/** First Pakistani mobile number in the text, as 03XXXXXXXXX. */
export function findPhone(text: string): string | null {
  const m = String(text ?? '').match(/(?:\+?\s*92|0092|\b0)?[\s-]*3\d{2}[\s-]*\d{3}[\s-]*\d{4}\b/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  const tail = digits.slice(-10);
  return /^3\d{9}$/.test(tail) ? `0${tail}` : null;
}

/** A known city named in the text (longest name first, word boundaries). */
export function findCity(text: string): string | null {
  const t = ` ${String(text ?? '').toLowerCase().replace(/[,.;:/|()-]+/g, ' ')} `;
  for (const c of CITIES) if (t.includes(` ${c.toLowerCase()} `)) return c;
  for (const [alias, city] of Object.entries(CITY_ALIASES)) if (t.includes(` ${alias} `)) return city;
  return null;
}

/** "Rs 2,500", "2500/-", "PKR 2500" -> 2500. */
export function findAmount(text: string): number | null {
  const s = String(text ?? '');
  const m = s.match(/(?:rs\.?|pkr|cod)\s*[:=-]?\s*([\d,]+(?:\.\d+)?)/i) ?? s.match(/([\d,]+(?:\.\d+)?)\s*(?:\/-|rs\b|rupees|pkr)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Item text and quantity from one line, or null when the line is not an item. */
export function parseItemLine(raw: string): ParsedItem | null {
  let line = String(raw ?? '').trim().replace(/^[-*•\d]+[.)]\s+/, '').trim();
  if (!line) return null;
  let quantity: number | null = null;
  let price: number | undefined;
  const money = findAmount(line);
  if (money) {
    price = money;
    line = line.replace(/(?:@\s*)?(?:rs\.?|pkr)\s*[:=-]?\s*[\d,]+(?:\.\d+)?/i, '').replace(/[\d,]+(?:\.\d+)?\s*(?:\/-|rs\b|rupees|pkr)/i, '').trim();
  }
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => [number, string]]> = [
    [/^(\d{1,3})\s*(?:x|×|\*|pcs?|pieces?|qty)\s+(.+)$/i, (m) => [Number(m[1]), m[2]]],
    [/^(.+?)\s*(?:x|×|\*)\s*(\d{1,3})$/i, (m) => [Number(m[2]), m[1]]],
    [/^(.+?)[\s,-]*(?:qty|quantity|tadad)\s*[:=-]?\s*(\d{1,3})$/i, (m) => [Number(m[2]), m[1]]],
    [/^(.+?)[\s,-]+(\d{1,3})\s*(?:pcs?|pieces?|nos?|units?|qty)$/i, (m) => [Number(m[2]), m[1]]],
    [/^(\d{1,3})\s+([a-z].+)$/i, (m) => [Number(m[1]), m[2]]],
  ];
  for (const [re, pick] of patterns) {
    const m = line.match(re);
    if (m) {
      const [q, t] = pick(m);
      if (q > 0) { quantity = q; line = t; }
      break;
    }
  }
  line = line.replace(/^[\s:,-]+|[\s:,-]+$/g, '').trim();
  if (!line || !/[a-z؀-ۿ]/i.test(line)) return null;
  return { text: line.slice(0, 120), quantity: quantity ?? 1, ...(price !== undefined && { price }) };
}

const ADDRESS_HINT = /\b(house|h\s*#|h\.?\s*no|flat|street|st\s*#|st\.|gali|road|rd\b|block|sector|phase|town|colony|mohallah|mohalla|near|plot|apartment|floor|chowk|bazar|bazaar|village|tehsil|district|society|scheme|lane|avenue|dha|bahria|gulberg|model town|johar)\b/i;

function splitLabel(line: string): { label: string | null; value: string } {
  const m = line.match(/^\s*([a-z][a-z\s]{0,20}?)\s*[:=\-–]\s*(.*)$/i);
  if (m) {
    for (const [k, re] of Object.entries(LABELS)) if (re.test(m[1].trim())) return { label: k, value: m[2].trim() };
  }
  // "Name Ali Raza" without a colon: only for name/city/phone labels.
  for (const k of ['name', 'city', 'phone'] as const) {
    const re = new RegExp(`${LABELS[k].source}\\s+(.+)$`, 'i');
    const mm = line.match(re);
    if (mm) return { label: k, value: mm[mm.length - 1].trim() };
  }
  return { label: null, value: line.trim() };
}

export function parseOrderText(text: string): ParsedOrder {
  const out: ParsedOrder = { customerName: null, phone: null, address: null, city: null, items: [], codAmount: null };
  const lines = String(text ?? '').slice(0, 5000).split(/\r?\n/).map((l) => l.replace(/[*_~`]/g, '').trim()).filter(Boolean);
  const loose: string[] = [];
  let pendingQty: number | null = null;

  for (const line of lines) {
    const { label, value } = splitLabel(line);
    if (label === 'name' && value) { out.customerName ??= value.slice(0, 100); continue; }
    if (label === 'phone') { out.phone ??= findPhone(value); continue; }
    if (label === 'address' && value) {
      out.address ??= value.slice(0, 400);
      out.city ??= findCity(value);
      continue;
    }
    if (label === 'city' && value) { out.city ??= findCity(value) ?? value.slice(0, 80); continue; }
    if (label === 'amount') { out.codAmount ??= findAmount(`rs ${value}`); continue; }
    if (label === 'qty') {
      const q = Number(value.match(/\d+/)?.[0]);
      if (q > 0) {
        if (out.items.length) out.items[out.items.length - 1].quantity = q;
        else pendingQty = q;
      }
      continue;
    }
    if (label === 'size' && value && out.items.length) {
      out.items[out.items.length - 1].text += ` ${value}`;
      continue;
    }
    if (label === 'item' && value) {
      for (const part of value.split(/\s*[,;+]\s*|\s+and\s+/i)) {
        const it = parseItemLine(part);
        if (it) out.items.push(it);
      }
      if (pendingQty && out.items.length) { out.items[out.items.length - 1].quantity = pendingQty; pendingQty = null; }
      continue;
    }
    loose.push(line);
  }

  // Lines without a label: phone, city, money, address, then items and name.
  const rest: string[] = [];
  for (const line of loose) {
    const phone = findPhone(line);
    if (phone) {
      out.phone ??= phone;
      const left = line.replace(/(?:\+?\s*92|0092|\b0)?[\s-]*3\d{2}[\s-]*\d{3}[\s-]*\d{4}\b/, '').replace(/^[\s:,-]+|[\s:,-]+$/g, '');
      if (left && /[a-z]/i.test(left) && !out.customerName && left.length <= 40 && !ADDRESS_HINT.test(left)) out.customerName = left;
      continue;
    }
    const bare = line.replace(/[.,]+$/, '').trim();
    const city = findCity(bare);
    if (city && bare.split(/\s+/).length <= 3) { out.city ??= city; continue; }
    if (ADDRESS_HINT.test(line) || (city && line.length > 20)) {
      out.address = out.address ? `${out.address}, ${line}`.slice(0, 400) : line.slice(0, 400);
      out.city ??= city;
      continue;
    }
    const amount = findAmount(line);
    if (amount && !/[a-z]{3,}/i.test(line.replace(/\b(rs|pkr|cod|total|bill|only|amount)\b/gi, ''))) { out.codAmount ??= amount; continue; }
    rest.push(line);
  }

  for (const line of rest) {
    const hasQty = /(^\d{1,3}\s*(x|×|\*|pcs?)\s)|((x|×|\*)\s*\d{1,3}$)|\b(qty|pcs|pieces)\b/i.test(line);
    if (!hasQty && !out.customerName && /^[a-z][a-z.\s]{1,40}$/i.test(line) && line.split(/\s+/).length <= 4) {
      out.customerName = line;
      continue;
    }
    const it = parseItemLine(line);
    if (it) out.items.push(it);
  }

  if (out.codAmount === null) {
    const priced = out.items.filter((i) => i.price);
    if (priced.length && priced.length === out.items.length) out.codAmount = priced.reduce((s, i) => s + (i.price ?? 0), 0);
  }
  out.items = out.items.slice(0, 30);
  return out;
}
