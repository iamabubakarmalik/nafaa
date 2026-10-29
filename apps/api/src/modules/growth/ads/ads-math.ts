/**
 * Ads spend: reading an ads manager export (Meta, TikTok, Google) and the
 * ROAS figures. Pure functions, shared by the service and the tests.
 *
 * Export reading: the web sends the sheet's header row and rows. Columns are
 * found by their header (date, spend, campaign, orders); the shop can map a
 * column the header did not give away. Rows are summed per day and campaign,
 * and each sum gets an import key (platform, day, campaign), so importing the
 * same export twice changes nothing.
 *
 *   ROAS            online sales ÷ ads spend
 *   cost per order  ads spend ÷ online orders
 *   profit after ads  profit of the online orders (after selling costs) − ads spend
 */

export const AD_PLATFORMS = ['META', 'TIKTOK', 'GOOGLE', 'OTHER'] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const AD_FIELDS = ['date', 'spend', 'campaign', 'orders'] as const;
export type AdField = (typeof AD_FIELDS)[number];
export type AdColumnMap = Partial<Record<AdField, number>>;

export const r2 = (v: number) => Math.round(v * 100) / 100;

/** ROAS as "x times"; null without spend. */
export const roas = (sales: number, spend: number) => (spend > 0 ? Math.round((sales / spend) * 100) / 100 : null);
export const costPerOrder = (spend: number, orders: number) => (orders > 0 ? r2(spend / orders) : null);

const norm = (h: string) => h.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Header words that give each field away, best first. */
const HINTS: Record<AdField, RegExp[]> = {
  date: [/^day$/, /^date$/, /^by day$/, /^reporting starts$/, /^stat time day$/, /\bdate\b/, /\bday\b/],
  spend: [/^amount spent/, /^total cost$/, /^cost$/, /^spend$/, /^amount spent\b/, /\bspent\b/, /\bspend\b/, /\bcost\b(?!.*\bper\b)/],
  campaign: [/^campaign name$/, /^campaign$/, /\bcampaign name\b/, /\bcampaign\b(?!.*\bid\b)/, /^ad set name$/, /^ad name$/],
  orders: [/^purchases$/, /^website purchases$/, /^complete payment$/, /^conversions$/, /^results$/, /\bpurchases?\b(?!.*\b(value|cost)\b)/, /\bconversions?\b(?!.*\b(value|rate|cost)\b)/],
};

/** Finds the columns by header. Spend and date are needed; the rest is optional. */
export function detectColumns(headers: string[]): AdColumnMap {
  const names = headers.map((h) => norm(String(h ?? '')));
  const used = new Set<number>();
  const out: AdColumnMap = {};
  for (const f of AD_FIELDS) {
    for (const re of HINTS[f]) {
      const i = names.findIndex((n, idx) => !used.has(idx) && re.test(n) && !/\b(per|rate|cpc|cpm|ctr)\b/.test(n));
      if (i >= 0) { out[f] = i; used.add(i); break; }
    }
  }
  return out;
}

/** Guesses the platform from the headers (the shop can change it). */
export function guessPlatform(headers: string[]): AdPlatform {
  const all = headers.map((h) => norm(String(h ?? ''))).join('|');
  if (/amount spent|reporting starts|ad set name|reach\b|impressions.*frequency/.test(all)) return 'META';
  if (/complete payment|tiktok|by day|stat time|video views at/.test(all)) return 'TIKTOK';
  if (/avg cpc|interaction rate|search impr|conv value/.test(all)) return 'GOOGLE';
  return /campaign name/.test(all) ? 'META' : 'OTHER';
}

/** "Rs 1,234.50", "PKR 1234", "1.234,50" → number; null when not a number. */
export function parseAmount(raw: unknown): number | null {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, '');
  // "1.234,50": the comma is the decimal point.
  if (/,\d{1,2}$/.test(s) && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const valid = (y: number, m: number, d: number) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/**
 * Date text → YYYY-MM-DD. `monthFirst` reads 03/04/2026 as 4 March (US);
 * otherwise as 3 April. Returns null when it is not a date.
 */
export function parseDay(raw: unknown, monthFirst = false): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const a = Number(m[1]); const b = Number(m[2]); const y = fullYear(Number(m[3]));
    const [mo, d] = monthFirst ? [a, b] : [b, a];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(s) ?? null;
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()) + 1; const d = Number(m[2]); const y = Number(m[3]);
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/i.exec(s);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1; const d = Number(m[1]); const y = Number(m[3]);
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

/** True when the slash dates in the column are month-first (some second part is above 12). */
export function monthFirstDates(values: unknown[]): boolean {
  let monthFirst = false;
  for (const v of values) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(String(v ?? '').trim());
    if (!m) continue;
    if (Number(m[1]) > 12) return false;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  return monthFirst;
}

export interface AdImportRow {
  day: string;
  campaign: string | null;
  amount: number;
  orders: number | null;
  importKey: string;
}

export interface AdImportResult {
  map: AdColumnMap;
  /** Fields that could not be found and are needed. */
  needs: AdField[];
  rows: AdImportRow[];
  skipped: number;
}

export const importKeyOf = (platform: AdPlatform, day: string, campaign: string | null) =>
  `${platform}|${day}|${(campaign ?? '').trim().toLowerCase().slice(0, 120)}`;

/** Reads the export into one row per day and campaign. Total lines and blank rows are skipped. */
export function readAdsExport(headers: string[], rows: unknown[][], platform: AdPlatform, mapping?: AdColumnMap): AdImportResult {
  const map: AdColumnMap = { ...detectColumns(headers), ...(mapping ?? {}) };
  for (const f of AD_FIELDS) if (map[f] !== undefined && (map[f]! < 0 || map[f]! >= headers.length)) delete map[f];
  const needs = (['date', 'spend'] as AdField[]).filter((f) => map[f] === undefined);
  if (needs.length) return { map, needs, rows: [], skipped: rows.length };
  const monthFirst = monthFirstDates(rows.map((r) => r[map.date!]));
  const sums = new Map<string, AdImportRow>();
  let skipped = 0;
  for (const r of rows) {
    const day = parseDay(r[map.date!], monthFirst);
    const amount = parseAmount(r[map.spend!]);
    if (!day || amount === null || amount < 0) { skipped++; continue; }
    const campaign = map.campaign !== undefined ? String(r[map.campaign] ?? '').trim().slice(0, 120) || null : null;
    const orders = map.orders !== undefined ? parseAmount(r[map.orders]) : null;
    const key = importKeyOf(platform, day, campaign);
    const cur = sums.get(key) ?? { day, campaign, amount: 0, orders: null, importKey: key };
    cur.amount = r2(cur.amount + amount);
    if (orders !== null) cur.orders = (cur.orders ?? 0) + Math.round(orders);
    sums.set(key, cur);
  }
  const out = [...sums.values()].filter((x) => x.amount > 0 || (x.orders ?? 0) > 0).sort((a, b) => a.day.localeCompare(b.day));
  return { map, needs: [], rows: out, skipped };
}

/** Monday of the week of a day key. */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/** Spreads a spend over the products it promoted, by each product's online sales (equal when none sold). */
export function spreadOverProducts(amount: number, productIds: string[], salesOf: (id: string) => number): Map<string, number> {
  const out = new Map<string, number>();
  const ids = [...new Set(productIds)];
  if (!ids.length || !(amount > 0)) return out;
  const weights = ids.map((id) => Math.max(0, salesOf(id)));
  const sum = weights.reduce((s, w) => s + w, 0);
  ids.forEach((id, i) => out.set(id, sum > 0 ? (amount * weights[i]) / sum : amount / ids.length));
  return out;
}
