/**
 * Dispatch: labels, loadsheets, courier rate compare, the dispatch scan
 * check, the dispatch report buckets, the COD (CPR) audit and Pakistan Post
 * article entry. Pure functions, so the screens, the service and the tests
 * share one set of rules.
 */

import { CourierRate, OrderCostSettings, codFeeOf, r2, rateCharge, rtoCostOf } from './order-costs';
import { STUCK_DAYS } from './order-board';

/** Pakistan Post: no merchant API, the shop writes article numbers by hand. */
export const PAKPOST = 'PAKPOST';
export const pakPostTrackUrl = (article: string) => `https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz=${encodeURIComponent(article)}`;

export const AFTER_BOOK = ['NONE', 'PACKED', 'DISPATCHED'] as const;
export type AfterBook = (typeof AFTER_BOOK)[number];

export interface DispatchSettings {
  /** Board column a booked order moves to. */
  afterBook: AfterBook;
  labelSize: '4x6' | 'A4';
  /** Return address printed on labels; empty = the shop's own. */
  returnName: string;
  returnPhone: string;
  returnAddress: string;
}

export const defaultDispatchSettings = (): DispatchSettings => ({ afterBook: 'PACKED', labelSize: '4x6', returnName: '', returnPhone: '', returnAddress: '' });

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export function normalizeDispatchSettings(raw: unknown): DispatchSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as any;
  return {
    afterBook: AFTER_BOOK.includes(s.afterBook) ? s.afterBook : 'PACKED',
    labelSize: s.labelSize === 'A4' ? 'A4' : '4x6',
    returnName: text(s.returnName, 80),
    returnPhone: text(s.returnPhone, 30),
    returnAddress: text(s.returnAddress, 240),
  };
}

// ─── Labels ──────────────────────────────────────────────────────

export interface LabelItem { name: string; variant?: string | null; quantity: number }

export interface LabelInput {
  id: string;
  number: string;
  trackingNumber: string | null;
  courierCode: string | null;
  courierName: string | null;
  courierLabelUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  items: LabelItem[];
  /** Money the courier collects (0 = prepaid). */
  cod: number;
  weightKg: number | null;
  /** Pieces sent at booking, when known. */
  pieces?: number | null;
  notes?: string | null;
}

export interface Label {
  id: string;
  number: string;
  /** What the barcode holds: the CN, else the order number. */
  barcode: string;
  trackingNumber: string | null;
  courierCode: string | null;
  courierName: string | null;
  /** The courier's own label, when its API gave one. */
  courierLabelUrl: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  /** Short item list for the label; the rest is counted in `moreItems`. */
  lines: string[];
  moreItems: number;
  pieces: number;
  weightKg: number | null;
  cod: number;
  prepaid: boolean;
  notes: string | null;
}

/** Barcode text: letters and digits only, upper case (CODE128 reads it on every scanner). */
export const barcodeText = (v: string) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** One label from an order. At most `maxLines` item lines; the rest are counted. */
export function labelOf(o: LabelInput, maxLines = 4): Label {
  const items = o.items.filter((i) => i && Number(i.quantity) > 0);
  const lines = items.slice(0, maxLines).map((i) => `${Number(i.quantity)} x ${String(i.name ?? 'Item').slice(0, 48)}${i.variant ? ` (${String(i.variant).slice(0, 24)})` : ''}`);
  const qty = items.reduce((s, i) => s + Number(i.quantity), 0);
  const cod = Math.max(0, Math.round(Number(o.cod) || 0));
  return {
    id: o.id,
    number: o.number,
    barcode: barcodeText(o.trackingNumber || o.number),
    trackingNumber: o.trackingNumber,
    courierCode: o.courierCode,
    courierName: o.courierName,
    courierLabelUrl: o.courierLabelUrl && /^https:\/\//.test(o.courierLabelUrl) ? o.courierLabelUrl : null,
    customerName: o.customerName || 'Customer',
    customerPhone: o.customerPhone ?? '',
    address: o.customerAddress ?? '',
    city: o.customerCity ?? '',
    lines,
    moreItems: Math.max(0, items.length - lines.length),
    pieces: Math.max(1, Math.round(Number(o.pieces) || qty || 1)),
    weightKg: o.weightKg && o.weightKg > 0 ? r2(o.weightKg) : null,
    cod,
    prepaid: cod === 0,
    notes: o.notes?.trim() ? o.notes.trim().slice(0, 140) : null,
  };
}

/** Labels split into printed pages: 1 per 4x6 sheet, 3 per A4 sheet. */
export function labelPages<T>(labels: T[], size: '4x6' | 'A4'): T[][] {
  const per = size === 'A4' ? 3 : 1;
  const pages: T[][] = [];
  for (let i = 0; i < labels.length; i += per) pages.push(labels.slice(i, i + per));
  return pages;
}

// ─── Loadsheet ───────────────────────────────────────────────────

export interface LoadsheetRow {
  orderId: string;
  number: string;
  trackingNumber: string;
  courierCode: string;
  customerName: string;
  city: string | null;
  cod: number;
  pieces: number;
  weightKg: number | null;
}

export interface Loadsheet {
  courierCode: string;
  rows: LoadsheetRow[];
  totals: { parcels: number; pieces: number; weightKg: number; cod: number };
}

/** Parcels grouped per courier (sorted by CN), with totals. Couriers sorted by parcel count. */
export function buildLoadsheets(rows: LoadsheetRow[]): Loadsheet[] {
  const by = new Map<string, LoadsheetRow[]>();
  for (const r of rows) {
    if (!r.trackingNumber) continue;
    const list = by.get(r.courierCode) ?? [];
    if (!list.some((x) => x.trackingNumber === r.trackingNumber)) list.push(r);
    by.set(r.courierCode, list);
  }
  return [...by.entries()].map(([courierCode, list]) => {
    const sorted = [...list].sort((a, b) => a.trackingNumber.localeCompare(b.trackingNumber));
    return {
      courierCode,
      rows: sorted,
      totals: {
        parcels: sorted.length,
        pieces: sorted.reduce((s, r) => s + Math.max(1, r.pieces || 1), 0),
        weightKg: r2(sorted.reduce((s, r) => s + (r.weightKg && r.weightKg > 0 ? r.weightKg : 0), 0)),
        cod: r2(sorted.reduce((s, r) => s + Math.max(0, r.cod || 0), 0)),
      },
    };
  }).sort((a, b) => b.totals.parcels - a.totals.parcels || a.courierCode.localeCompare(b.courierCode));
}

// ─── Rate compare ────────────────────────────────────────────────

export interface RateHistory {
  /** Finished parcels (delivered + returned) in the customer's city and overall. */
  cityDelivered: number;
  cityReturned: number;
  delivered: number;
  returned: number;
}

export interface RateQuote {
  code: string;
  /** Forward charge from the shop's rate card; null = no rate set. */
  charge: number | null;
  codFee: number;
  /** Return leg when the parcel comes back. */
  rtoCost: number;
  /** Returned share of finished parcels, %; null without history. */
  rtoRate: number | null;
  /** Where `rtoRate` came from. */
  basis: 'CITY' | 'ALL' | 'NONE';
  sample: number;
  /** Cost expected per parcel: charge + COD fee when delivered + return leg when returned. */
  expected: number | null;
  best: boolean;
}

/** A city needs this many finished parcels before its own RTO rate is used. */
export const RATE_CITY_SAMPLE = 8;
/** A courier's RTO may be this many points above the best one and still count as good. */
export const RTO_SLACK = 5;

/**
 * One quote per courier for a parcel. RTO rate comes from the shop's history
 * in the city (enough parcels), else overall. The preselected ("best")
 * courier is the cheapest expected cost among those whose RTO rate is close
 * to the best known one; couriers with no rate card are never preselected.
 */
export function compareRates(
  couriers: string[],
  rates: OrderCostSettings['couriers'],
  history: Record<string, RateHistory | undefined>,
  parcel: { city: string | null; weightKg: number | null; cod: number },
): RateQuote[] {
  const quotes: RateQuote[] = couriers.map((code) => {
    const rate: CourierRate | undefined = rates[code];
    const charge = rateCharge(rate, parcel.city, parcel.weightKg);
    const codFee = codFeeOf(rate, parcel.cod);
    const rtoCost = charge === null ? 0 : rtoCostOf(rate, charge);
    const h = history[code];
    const cityDone = h ? h.cityDelivered + h.cityReturned : 0;
    const allDone = h ? h.delivered + h.returned : 0;
    const basis: RateQuote['basis'] = cityDone >= RATE_CITY_SAMPLE ? 'CITY' : allDone > 0 ? 'ALL' : 'NONE';
    const rtoRate = basis === 'CITY' ? (h!.cityReturned / cityDone) * 100 : basis === 'ALL' ? (h!.returned / allDone) * 100 : null;
    const share = (rtoRate ?? 0) / 100;
    const expected = charge === null ? null : r2(charge + codFee * (1 - share) + rtoCost * share);
    return {
      code, charge, codFee, rtoCost,
      rtoRate: rtoRate === null ? null : Math.round(rtoRate * 10) / 10,
      basis, sample: basis === 'CITY' ? cityDone : allDone, expected, best: false,
    };
  });
  const priced = quotes.filter((q) => q.expected !== null);
  const known = priced.filter((q) => q.rtoRate !== null).map((q) => q.rtoRate!);
  const bestRto = known.length ? Math.min(...known) : null;
  const good = priced.filter((q) => bestRto === null || q.rtoRate === null || q.rtoRate <= bestRto + RTO_SLACK);
  const pick = (good.length ? good : priced).sort((a, b) => a.expected! - b.expected! || (a.rtoRate ?? 100) - (b.rtoRate ?? 100))[0];
  if (pick) pick.best = true;
  return quotes;
}

// ─── Dispatch scan ───────────────────────────────────────────────

export type ScanProblem = 'NOT_ACCEPTED' | 'NOT_PACKED' | 'ALREADY_SENT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'DELETED';

/**
 * Can this parcel leave the shop now? Packed (READY) orders can. Accepted
 * orders that skipped the packing scan need `force`. Everything else is a
 * mistake to show loudly.
 */
export function dispatchCheck(o: { orderStatus: string; nafaaSaleId: string | null; dispatchedAt: Date | null; deletedAt?: Date | null }, force = false): ScanProblem | null {
  if (o.deletedAt) return 'DELETED';
  if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'REJECTED') return 'CANCELLED';
  if (o.orderStatus === 'RETURNED') return 'RETURNED';
  if (o.orderStatus === 'DELIVERED') return 'DELIVERED';
  if (o.orderStatus === 'OUT_FOR_DELIVERY' || o.dispatchedAt) return 'ALREADY_SENT';
  if (!o.nafaaSaleId || o.orderStatus === 'PENDING' || o.orderStatus === 'ACCEPTING') return 'NOT_ACCEPTED';
  if (o.orderStatus !== 'READY' && !force) return 'NOT_PACKED';
  return null;
}

// ─── Dispatch report ─────────────────────────────────────────────

export const REPORT_TABS = [
  'all', 'open', 'delivered', 'returns', 'rto_wh', 'pending_rto', 'ofd', 'issue', 'stuck', 'claims', 'redispatched', 'replacement', 'cancelled',
] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export interface ReportOrder {
  orderStatus: string;
  courierStatus: string | null;
  stage: string | null;
  dispatchedAt: Date;
  replacementOfId: string | null;
  /** metadata.rtoReceived: the returned parcel was checked in at the shop. */
  rtoReceived: boolean;
  claim: boolean;
  redispatched: boolean;
}

const OPEN = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

/** Every audit tab an order falls in. */
export function reportTabs(o: ReportOrder, now = Date.now()): ReportTab[] {
  const tabs: ReportTab[] = ['all'];
  const open = OPEN.includes(o.orderStatus);
  if (open) tabs.push('open');
  if (o.orderStatus === 'DELIVERED') tabs.push('delivered');
  if (o.orderStatus === 'RETURNED') tabs.push('returns');
  if (o.orderStatus === 'RETURNED' && o.rtoReceived) tabs.push('rto_wh');
  if ((o.orderStatus === 'RETURNED' && !o.rtoReceived) || (open && (o.courierStatus === 'RETURNING' || o.courierStatus === 'RETURNED'))) tabs.push('pending_rto');
  if (open && o.courierStatus === 'OUT_FOR_DELIVERY') tabs.push('ofd');
  if (open && (o.stage === 'ISSUE' || o.courierStatus === 'ATTEMPTED')) tabs.push('issue');
  if (o.orderStatus === 'OUT_FOR_DELIVERY' && now - o.dispatchedAt.getTime() > STUCK_DAYS * 86_400_000) tabs.push('stuck');
  if (o.claim || o.stage === 'CLAIM') tabs.push('claims');
  if (o.redispatched) tabs.push('redispatched');
  if (o.replacementOfId) tabs.push('replacement');
  if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'REJECTED') tabs.push('cancelled');
  return tabs;
}

export interface ReportTotals {
  dispatched: number; delivered: number; returned: number; inProcess: number; rtoInWarehouse: number; cancelled: number;
  claims: number; deliveredCod: number; redispatched: number; replacement: number;
  /** Delivered out of finished (delivered + returned), %. */
  successRate: number | null;
}

/** Totals over orders already sorted into tabs. `cod` is the delivered order's COD. */
export function reportTotals(rows: Array<{ tabs: ReportTab[]; cod: number }>): ReportTotals {
  const n = (t: ReportTab) => rows.filter((r) => r.tabs.includes(t)).length;
  const delivered = n('delivered');
  const returned = n('returns');
  return {
    dispatched: rows.length, delivered, returned, inProcess: n('open'), rtoInWarehouse: n('rto_wh'), cancelled: n('cancelled'),
    claims: n('claims'), redispatched: n('redispatched'), replacement: n('replacement'),
    deliveredCod: r2(rows.filter((r) => r.tabs.includes('delivered')).reduce((s, r) => s + r.cod, 0)),
    successRate: delivered + returned ? Math.round((delivered / (delivered + returned)) * 1000) / 10 : null,
  };
}

// ─── COD / CPR audit ─────────────────────────────────────────────

export interface AuditInput {
  /** COD the courier collected. */
  cod: number;
  /** Money the statement says was paid for this parcel; null = not in a statement. */
  received: number | null;
  /** Charges the courier deducted (statement); null = unknown. */
  charge: number | null;
  codFee: number | null;
  /** The same charges from the shop's rate card. */
  rateCharge: number | null;
  rateCodFee: number;
}

export interface AuditResult {
  /** COD less the charges the courier was allowed to take (statement, else rate card). */
  expectedNet: number;
  /** Paid less than expected; 0 when fine or unknown. */
  short: number;
  /** Deducted more than the rate card allows; 0 when fine or unknown. */
  overCharge: number;
}

/** Differences up to this many rupees are rounding, not a problem. */
export const AUDIT_TOLERANCE = 2;

export function auditRow(a: AuditInput): AuditResult {
  const deducted = a.charge !== null || a.codFee !== null ? (a.charge ?? 0) + (a.codFee ?? 0) : null;
  const allowed = a.rateCharge !== null ? a.rateCharge + a.rateCodFee : null;
  const expectedNet = r2(Math.max(0, a.cod - (deducted ?? allowed ?? 0)));
  const short = a.received !== null && expectedNet - a.received > AUDIT_TOLERANCE ? r2(expectedNet - a.received) : 0;
  const overCharge = deducted !== null && allowed !== null && deducted - allowed > AUDIT_TOLERANCE ? r2(deducted - allowed) : 0;
  return { expectedNet, short, overCharge };
}

// ─── Pakistan Post article numbers ───────────────────────────────

/** An article number: letters and digits, at least 8, with a digit (RGL12345678, VPL…, UMS…). */
const ARTICLE = /^[A-Z]{0,4}\d{6,}[A-Z]{0,2}$/;

/**
 * Article numbers typed or pasted in bulk. A line can be "order# article"
 * (either order, any separator) or just the article; lines with only an
 * article are matched to the picked orders in their order.
 */
export function parseArticles(input: string): Array<{ ref: string | null; article: string }> {
  const out: Array<{ ref: string | null; article: string }> = [];
  for (const line of String(input ?? '').split(/\r?\n/)) {
    const tokens = line.split(/[\s,;\t|]+/).map((t) => t.replace(/^#+/, '').trim().toUpperCase()).filter(Boolean);
    if (!tokens.length) continue;
    const article = tokens.find((t) => ARTICLE.test(t) && /[A-Z]/.test(t)) ?? tokens.find((t) => ARTICLE.test(t) && t.length >= 10);
    if (!article) continue;
    const ref = tokens.find((t) => t !== article) ?? null;
    out.push({ ref, article });
  }
  return out.slice(0, 500);
}
